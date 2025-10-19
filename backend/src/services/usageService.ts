import { PrismaClient } from '@prisma/client';
import { logger } from '../logger.js';

export class UsageService {
  constructor(private prisma: PrismaClient) {}

  async logUsage(apiKeyId: string, action: string, jobId?: string): Promise<void> {
    try {
      await this.prisma.usage.create({
        data: {
          apiKeyId,
          action,
          jobId,
        },
      });
    } catch (error) {
      logger.error({ error, apiKeyId, action }, 'Failed to log usage');
      // Don't throw - usage logging shouldn't break the main flow
    }
  }

  async getUsageStats(apiKeyId: string, since: Date): Promise<{
    totalRequests: number;
    jobsCreated: number;
    assetsDownloaded: number;
  }> {
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