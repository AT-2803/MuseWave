import { logger } from '../logger.js';
import { jobCount } from '../metrics.js';
export class JobService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async updateJobStatus(jobId, status, error) {
        try {
            await this.prisma.job.update({
                where: { id: jobId },
                data: {
                    status,
                    ...(error && { error }),
                    updatedAt: new Date(),
                },
            });
            jobCount.inc({ status });
            logger.info({ jobId, status }, 'Job status updated');
        }
        catch (error) {
            logger.error({ error, jobId, status }, 'Failed to update job status');
            throw error;
        }
    }
    async createAsset(jobId, type, url, size) {
        try {
            const asset = await this.prisma.asset.create({
                data: {
                    jobId,
                    type,
                    url,
                    size,
                },
            });
            logger.info({ jobId, assetId: asset.id, type }, 'Asset created');
            return asset.id;
        }
        catch (error) {
            logger.error({ error, jobId, type }, 'Failed to create asset');
            throw error;
        }
    }
    async getJobWithAssets(jobId) {
        return this.prisma.job.findUnique({
            where: { id: jobId },
            include: {
                assets: true,
            },
        });
    }
}
export const jobService = (prisma) => new JobService(prisma);
