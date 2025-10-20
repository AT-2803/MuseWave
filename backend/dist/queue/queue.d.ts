import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
interface JobHandler {
    (job: any): Promise<any>;
}
interface WorkerConfig {
    type: string;
    concurrency: number;
    handler: JobHandler;
}
export declare class Queue extends EventEmitter {
    private prisma;
    private workers;
    private running;
    private activeJobs;
    constructor(prisma: PrismaClient);
    registerWorker(config: WorkerConfig): void;
    enqueue(type: string, params: any, options?: {
        apiKeyId?: string;
        maxRetries?: number;
        backoffMs?: number;
    }): Promise<string>;
    start(): void;
    stop(): void;
    private processQueue;
    private processJob;
    private processMusicJob;
}
export {};
