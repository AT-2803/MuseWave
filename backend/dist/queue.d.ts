import { PrismaClient } from '@prisma/client';
import { Logger } from './logger';
import { EnqueueOptions, EnqueueResponse, JobType, WorkerConfig } from './types';
export declare class Queue {
    private prisma;
    private logger;
    private workers;
    private pollTimer?;
    private running;
    constructor(deps: {
        prisma: PrismaClient;
        logger: Logger;
    });
    registerWorker(config: WorkerConfig): void;
    start(): void;
    stop(): void;
    enqueue(type: JobType, params: Record<string, unknown>, options?: EnqueueOptions): Promise<EnqueueResponse>;
    private computeDedupeKey;
    private wakeWorkers;
    private kickWorker;
    private processNext;
    private claimNextJob;
    private executeJob;
    private handleFailure;
    private materializeJob;
}
