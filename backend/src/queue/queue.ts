import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import { logger } from '../logger.js';
import { config } from '../config.js';
import { queueSize, jobCount } from '../metrics.js';

interface JobHandler {
  (job: any): Promise<any>;
}

interface WorkerConfig {
  type: string;
  concurrency: number;
  handler: JobHandler;
}

export class Queue extends EventEmitter {
  private prisma: PrismaClient;
  private workers = new Map<string, WorkerConfig>();
  private running = false;
  private activeJobs = new Set<string>();

  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
  }

  registerWorker(config: WorkerConfig) {
    this.workers.set(config.type, config);
  }

  async enqueue(type: string, params: any, options: {
    apiKeyId?: string;
    maxRetries?: number;
    backoffMs?: number;
  } = {}): Promise<string> {
    const job = await this.prisma.job.create({
      data: {
        status: 'pending',
        prompt: params.prompt || '',
        duration: params.duration || 30,
        includeVideo: params.includeVideo || false,
        plan: params.plan || null,
        userId: options.apiKeyId,
      },
    });

    logger.info({ jobId: job.id, type }, 'Job enqueued');
    queueSize.inc();

    if (this.running) {
      this.processQueue();
    }

    return job.id;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.processQueue();
    logger.info('Queue started');
  }

  stop() {
    this.running = false;
    logger.info('Queue stopped');
  }

  private async processQueue() {
    if (!this.running) return;

    console.log('DEBUG: processQueue called, running =', this.running);

    try {
      console.log('DEBUG: About to enter main try block');
      logger.debug('Starting queue processing cycle');

      // Get pending jobs
      logger.debug('About to query pending jobs');
      logger.debug({ prismaExists: !!this.prisma }, 'Prisma client check');
      logger.debug({ configValue: config.QUEUE_CONCURRENCY }, 'Queue concurrency config');

      console.log('DEBUG: About to call prisma.job.findMany');
      console.log('DEBUG: this.prisma =', !!this.prisma);
      console.log('DEBUG: this.prisma.job =', !!this.prisma?.job);
      console.log('DEBUG: typeof this.prisma.job =', typeof this.prisma?.job);
      const pendingJobs = await this.prisma.job.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' },
        take: config.QUEUE_CONCURRENCY,
      });
      console.log('DEBUG: prisma.job.findMany completed');

      console.log('DEBUG: pendingJobs =', JSON.stringify(pendingJobs, null, 2));
      logger.debug({ pendingJobsCount: pendingJobs.length }, 'Found pending jobs');

      if (pendingJobs.length === 0) {
        // No jobs to process, just return without logging error
        return;
      }

      // Check for any undefined jobs in the array
      logger.debug('Checking for undefined jobs in array');
      for (let i = 0; i < pendingJobs.length; i++) {
        console.log(`DEBUG: pendingJobs[${i}] =`, JSON.stringify(pendingJobs[i], null, 2));
        const job = pendingJobs[i];
        if (!job) {
          logger.error({ index: i }, 'Found undefined job in pendingJobs array at index');
          continue;
        }
        console.log(`DEBUG: job.id = ${job.id}, job.status = ${job.status}`);
        logger.debug({ index: i, jobId: job.id, status: job.status }, 'Job at index is valid');
      }

      // Additional safety check - ensure all jobs have required properties
      const validJobs = pendingJobs.filter(job => {
        if (!job) {
          logger.error('Found null/undefined job in array');
          return false;
        }
        if (!job.id) {
          logger.error({ job }, 'Job missing id property');
          return false;
        }
        if (!job.status) {
          logger.error({ job }, 'Job missing status property');
          return false;
        }
        return true;
      });

      console.log('DEBUG: validJobs count =', validJobs.length);
      logger.debug({ validJobsCount: validJobs.length, originalCount: pendingJobs.length }, 'Filtered valid jobs');

      // Process validated jobs up to concurrency limit
      for (const job of validJobs) {
        try {
          if (!job) {
            logger.error({ pendingJobs }, 'Found undefined job in pendingJobs array');
            continue;
          }

          if (!job.id) {
            logger.error({ job }, 'Job missing id property');
            continue;
          }

          // Only process jobs that are still pending
          if (job.status !== 'pending') {
            logger.debug({ jobId: job.id, status: job.status }, 'Skipping non-pending job');
            continue;
          }

          if (this.activeJobs.size >= config.QUEUE_CONCURRENCY) {
            logger.debug('Reached concurrency limit, deferring remaining jobs');
            break;
          }

          this.activeJobs.add(job.id);
          logger.debug({ jobId: job.id }, 'About to call processJob');

          // schedule processing without awaiting so multiple jobs can run in parallel
          this.processJob(job).catch(err => {
            logger.error({ err, jobId: job?.id }, 'Job processing failed');
          });
        } catch (outerErr) {
          logger.error({ outerErr }, 'Unexpected error while scheduling job');
        }
      }
    } catch (error) {
      // Only log actual errors, not empty objects
      if (error && (error instanceof Error || typeof error === 'string')) {
        logger.error({ error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, 'Queue processing error');
      } else {
        logger.error({ error }, 'Queue processing error - unknown error type');
      }
    }

    // Continue processing
    setTimeout(() => this.processQueue(), 1000);
  }

  private async processJob(job: any) {
    try {
      logger.debug({ jobId: job.id }, 'Starting job processing');

      await this.prisma.job.update({
        where: { id: job.id },
        data: { status: 'processing' },
      });

      // Process the music generation job
      const result = await this.processMusicJob(job);

      await this.prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          plan: JSON.stringify(result.plan),
        },
      });

      jobCount.inc({ status: 'completed' });
      logger.info({ jobId: job.id }, 'Job completed');
    } catch (error) {
      logger.error({ error, stack: error instanceof Error ? error.stack : undefined, jobId: job.id }, 'Job failed');

      await this.prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          // error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      jobCount.inc({ status: 'failed' });
    } finally {
      this.activeJobs.delete(job.id);
      queueSize.dec();
    }
  }

  private async processMusicJob(job: any) {
    try {
      logger.debug({ jobId: job.id }, 'Starting music job processing');

      const planServiceModule = await import('../services/planService.js');
      const audioServiceModule = await import('../services/audioService.js');
      const videoServiceModule = await import('../services/videoService.js');
      const jobServiceModule = await import('../services/jobService.js');

      const planService = planServiceModule.planService;
      const audioService = audioServiceModule.audioService;
      const videoService = videoServiceModule.videoService;
      const jobService = jobServiceModule.jobService;

      const jobSvc = jobService(this.prisma);

      // Generate plan
      const plan = await planService.generatePlan(job.prompt, job.duration);

      // Generate audio
      const audioPath = `/tmp/audio_${job.id}.wav`;
      await audioService.generateAudio(plan, job.duration, audioPath);

      // Create audio asset
      const audioAssetId = await jobSvc.createAsset(job.id, 'audio', `file://${audioPath}`, 0);

      let finalAssetId = audioAssetId;

      if (job.includeVideo) {
        // Generate video
        const videoPath = `/tmp/video_${job.id}.mp4`;
        await videoService.generateVideo(audioPath, plan, videoPath);

        // Create video asset
        finalAssetId = await jobSvc.createAsset(job.id, 'video', `file://${videoPath}`, 0);
      }

      return { plan, assetId: finalAssetId };
    } catch (error) {
      logger.error({ error, stack: error instanceof Error ? error.stack : undefined, jobId: job.id }, 'Music job processing failed');
      throw error;
    }
  }
}