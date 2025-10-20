import { logger } from '../logger.js';
export class UsageService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async logUsage(apiKeyId, action, jobId) {
        try {
            await this.prisma.usage.create({
                data: {
                    apiKeyId,
                    action,
                    jobId,
                },
            });
        }
        catch (error) {
            logger.error({ error, apiKeyId, action }, 'Failed to log usage');
            // Don't throw - usage logging shouldn't break the main flow
        }
    }
    async getUsageStats(apiKeyId, since) {
        const usages = await this.prisma.usage.findMany({
            where: {
                apiKeyId,
                timestamp: {
                    gte: since,
                },
            },
        });
        const stats = {
            totalRequests: usages.length,
            jobsCreated: usages.filter(u => u.action === 'job_created').length,
            assetsDownloaded: usages.filter(u => u.action === 'asset_downloaded').length,
        };
        return stats;
    }
}
