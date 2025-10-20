import { planService } from '../services/planService.js';
import { audioService } from '../services/audioService.js';
import { vocalService } from '../services/vocalService.js';
import { mixService } from '../services/mixService.js';
import { videoService } from '../services/videoService.js';
import { safetyService } from '../services/safetyService.js';
import { jobService } from '../services/jobService.js';
import { logger } from '../logger.js';
export function registerWorkers(queue) {
    // Plan generation worker
    queue.registerWorker('generate_plan', async (job) => {
        const { prompt, duration, includeVideo } = job.data;
        // Safety check
        const safety = await safetyService.checkContent(prompt);
        if (!safety.safe) {
            throw new Error(`Unsafe content: ${safety.reason}`);
        }
        // Generate plan
        const plan = await planService.generatePlan(prompt, duration);
        // Update job with plan
        await jobService.updateJobStatus(job.id, 'processing');
        // TODO: Save plan to job record
    });
    // Audio generation worker
    queue.registerWorker('generate_audio', async (job) => {
        const { plan, duration, outputPath } = job.data;
        await audioService.generateAudio(plan, duration, outputPath);
        // Create asset record
        const assetId = await jobService.createAsset(job.id, 'audio', `file://${outputPath}`);
        logger.info({ jobId: job.id, assetId }, 'Audio asset created');
    });
    // Vocal generation worker
    queue.registerWorker('generate_vocals', async (job) => {
        const { plan, duration, outputPath } = job.data;
        await vocalService.generateVocals(plan, duration, outputPath);
        const assetId = await jobService.createAsset(job.id, 'audio', `file://${outputPath}`);
        logger.info({ jobId: job.id, assetId }, 'Vocal asset created');
    });
    // Mixing worker
    queue.registerWorker('mix_audio', async (job) => {
        const { inputs, outputPath } = job.data;
        await mixService.mixTracks(inputs, outputPath);
        const assetId = await jobService.createAsset(job.id, 'audio', `file://${outputPath}`);
        logger.info({ jobId: job.id, assetId }, 'Mixed audio asset created');
    });
    // Video generation worker
    queue.registerWorker('generate_video', async (job) => {
        const { audioPath, plan, outputPath } = job.data;
        await videoService.generateVideo(audioPath, plan, outputPath);
        const assetId = await jobService.createAsset(job.id, 'video', `file://${outputPath}`);
        logger.info({ jobId: job.id, assetId }, 'Video asset created');
    });
    // Complete job worker
    queue.registerWorker('complete_job', async (job) => {
        await jobService.updateJobStatus(job.id, 'completed');
        logger.info({ jobId: job.id }, 'Job completed');
    });
}
