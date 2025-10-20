import { PrismaClient } from '@prisma/client';
export declare class UsageService {
    private prisma;
    constructor(prisma: PrismaClient);
    logUsage(apiKeyId: string, action: string, jobId?: string): Promise<void>;
    getUsageStats(apiKeyId: string, since: Date): Promise<{
        totalRequests: number;
        jobsCreated: number;
        assetsDownloaded: number;
    }>;
}
