import { PrismaClient } from '@prisma/client';
export declare class JobService {
    private prisma;
    constructor(prisma: PrismaClient);
    updateJobStatus(jobId: string, status: string, error?: string): Promise<void>;
    createAsset(jobId: string, type: 'audio' | 'video' | 'plan', url: string, size?: number): Promise<string>;
    getJobWithAssets(jobId: string): Promise<({
        assets: {
            path: string | null;
            type: string;
            url: string;
            id: string;
            createdAt: Date;
            jobId: string;
            meta: string | null;
            size: number | null;
        }[];
    } & {
        error: string | null;
        status: string;
        maxAttempts: number;
        id: string;
        userId: string | null;
        createdAt: Date;
        result: string | null;
        apiKeyId: string | null;
        prompt: string;
        duration: number;
        includeVideo: boolean;
        plan: string | null;
        attempts: number;
        parentId: string | null;
        assetId: string | null;
        dedupeKey: string | null;
        lastSuccessAt: Date | null;
        availableAt: Date;
        startedAt: Date | null;
        completedAt: Date | null;
        backoffMs: number;
        updatedAt: Date;
    }) | null>;
}
export declare const jobService: (prisma: PrismaClient) => JobService;
