import { PrismaClient } from '@prisma/client';
import { Queue } from './queue/queue.js';
declare module 'fastify' {
    interface FastifyInstance {
        prisma: PrismaClient;
        queue: Queue;
        ffmpeg: {
            available: boolean;
            spawn: (args: string[], options?: any) => any;
        };
    }
    interface FastifyRequest {
        apiKey?: {
            id: string;
            key: string;
            userId: string;
            createdAt: Date;
        };
    }
}
export type JobHandlerContext = {
    job: QueueJob;
    params: Record<string, unknown>;
};
export type JobHandlerResult = {
    result?: Record<string, unknown> | null;
    assetId?: string | null;
};
export type JobHandler = (ctx: JobHandlerContext) => Promise<JobHandlerResult | void>;
export type WorkerConfig = {
    type: JobType;
    concurrency?: number;
    handler: JobHandler;
};
export type EnqueueOptions = {
    parentId?: string;
    apiKeyId?: string;
    maxAttempts?: number;
    backoffMs?: number;
    metadata?: Record<string, unknown>;
};
export type EnqueueResponse = {
    jobId: string;
    status: JobStatus;
    reused: boolean;
    result?: Record<string, unknown> | null;
    assetId?: string | null;
};
export declare const JOB_TYPES: readonly ["PLAN", "AUDIO", "VOCALS", "MIX", "VIDEO"];
export type JobType = (typeof JOB_TYPES)[number];
export declare const JOB_TYPE: {
    readonly PLAN: JobType;
    readonly AUDIO: JobType;
    readonly VOCALS: JobType;
    readonly MIX: JobType;
    readonly VIDEO: JobType;
};
export declare const JOB_STATUS: readonly ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"];
export type JobStatus = (typeof JOB_STATUS)[number];
export interface QueueJob {
    id: string;
    type: JobType;
    status: JobStatus;
    params: Record<string, unknown>;
    result: Record<string, unknown> | null;
    error: string | null;
    attempts: number;
    maxAttempts: number;
    parentId?: string | null;
    assetId?: string | null;
    apiKeyId?: string | null;
    dedupeKey?: string | null;
    lastSuccessAt?: Date | null;
    availableAt: Date;
    startedAt?: Date | null;
    completedAt?: Date | null;
    backoffMs: number;
    createdAt: Date;
}
