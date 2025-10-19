import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import { logger } from '../logger.js';
import { config } from '../config.js';
import { queueSize } from '../metrics.js';

interface Job {
  id: string;
  type: string;
  data: any;
  priority?: number;
  maxRetries?: number;
  retryCount?: number;
  nextRunAt?: Date;
}

interface Worker {
  type: string;
  handler: (job: Job) => Promise<void>;
}

export class Queue extends EventEmitter {
  private prisma: PrismaClient;
  private workers = new Map<string, Worker>();
  private running = false;
  private activeJobs = new Set<string>();
  private queue: Job[] = [];

  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
  }

  registerWorker(type: string, handler: (job: Job) => Promise<void>): void {
    this.workers.set(type, { type, handler });
  }

  async enqueue(job: Omit<Job, 'id'>): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fullJob: Job = {
      id: jobId,
      maxRetries: config.QUEUE_MAX_RETRIES,
      retryCount: 0,
      nextRunAt: new Date(),
      ...job,
    };

    this.queue.push(fullJob);
    queueSize.set(this.queue.length);

    logger.info({ jobId, type: job.type }, 'Job enqueued');

    if (this.running) {
      this.processQueue();
    }

    return jobId;
  }

  start(): void {
    if (this.running) return;

    this.running = true;
    logger.info('Queue started');
    this.processQueue();
  }

  stop(): void {
    this.running = false;
    logger.info('Queue stopped');
  }

  private async processQueue(): Promise<void> {
    if (!this.running) return;

    const availableSlots = config.QUEUE_CONCURRENCY - this.activeJobs.size;
    if (availableSlots <= 0) return;

    // Sort by priority and nextRunAt
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return (b.priority || 0) - (a.priority || 0);
      }
      return (a.nextRunAt?.getTime() || 0) - (b.nextRunAt?.getTime() || 0);
    });

    const now = new Date();
    const jobsToProcess = this.queue
      .filter(job => !this.activeJobs.has(job.id) && (!job.nextRunAt || job.nextRunAt <= now))
      .slice(0, availableSlots);

    for (const job of jobsToProcess) {
      this.processJob(job);
    }

    queueSize.set(this.queue.length);
  }

  private async processJob(job: Job): Promise<void> {
    if (this.activeJobs.has(job.id)) return;

    this.activeJobs.add(job.id);
    const worker = this.workers.get(job.type);

    if (!worker) {
      logger.error({ jobId: job.id, type: job.type }, 'No worker found for job type');
      this.activeJobs.delete(job.id);
      this.removeJob(job.id);
      return;
    }

    try {
      logger.info({ jobId: job.id, type: job.type }, 'Processing job');
      await worker.handler(job);

      this.activeJobs.delete(job.id);
      this.removeJob(job.id);
      logger.info({ jobId: job.id }, 'Job completed successfully');

    } catch (error) {
      logger.error({ error, jobId: job.id, retryCount: job.retryCount }, 'Job failed');

      job.retryCount = (job.retryCount || 0) + 1;

      if (job.retryCount < (job.maxRetries || config.QUEUE_MAX_RETRIES)) {
        // Schedule retry with exponential backoff
        const delay = config.QUEUE_BACKOFF_MS * Math.pow(2, job.retryCount - 1);
        job.nextRunAt = new Date(Date.now() + delay);
        logger.info({ jobId: job.id, retryCount: job.retryCount, nextRunAt: job.nextRunAt }, 'Job scheduled for retry');
      } else {
        // Max retries reached
        this.activeJobs.delete(job.id);
        this.removeJob(job.id);
        logger.error({ jobId: job.id }, 'Job failed permanently after max retries');
        this.emit('jobFailed', job, error);
      }
    }

    // Continue processing
    setImmediate(() => this.processQueue());
  }

  private removeJob(jobId: string): void {
    this.queue = this.queue.filter(job => job.id !== jobId);
    queueSize.set(this.queue.length);
  }
}