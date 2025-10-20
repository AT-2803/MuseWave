import { createHash } from 'crypto';
import { setTimeout as sleep } from 'timers/promises';
import { JOB_STATUS, JOB_TYPES, } from './types';
import { jobCounter } from './metrics';
const DEFAULT_CONCURRENCY = 2;
const POLL_INTERVAL_MS = 750;
const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000;
export class Queue {
    prisma;
    logger;
    workers = new Map();
    pollTimer;
    running = false;
    constructor(deps) {
        this.prisma = deps.prisma;
        this.logger = deps.logger;
    }
    registerWorker(config) {
        if (this.workers.has(config.type)) {
            throw new Error(`Worker for type ${config.type} already registered`);
        }
        this.workers.set(config.type, { config, active: 0 });
    }
    start() {
        if (this.running)
            return;
        this.running = true;
        this.logger.info({ workers: [...this.workers.keys()] }, 'Queue started');
        this.pollTimer = setInterval(() => {
            for (const worker of this.workers.values()) {
                this.kickWorker(worker);
            }
        }, POLL_INTERVAL_MS);
    }
    stop() {
        this.running = false;
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = undefined;
        }
    }
    async enqueue(type, params, options = {}) {
        const dedupeKey = this.computeDedupeKey(type, params, options.parentId);
        const now = new Date();
        const since = new Date(now.getTime() - IDEMPOTENCY_WINDOW_MS);
        const existingRecord = await this.prisma.job.findFirst({
            where: {
                dedupeKey,
                status: 'SUCCEEDED',
                completedAt: { gte: since }
            }
        });
        if (existingRecord) {
            const existing = this.materializeJob(existingRecord);
            return {
                jobId: existing.id,
                status: existing.status,
                reused: true,
                result: existing.result,
                assetId: existing.assetId ?? null,
            };
        }
        const job = await this.prisma.job.create({
            data: {
                type,
                status: 'QUEUED',
                params: JSON.stringify(params),
                parentId: options.parentId,
                apiKeyId: options.apiKeyId,
                maxAttempts: options.maxAttempts ?? 3,
                backoffMs: options.backoffMs ?? 2000,
                dedupeKey,
                availableAt: now,
            },
        });
        this.logger.debug({ jobId: job.id, type: job.type }, 'Enqueued job');
        this.wakeWorkers(type);
        return { jobId: job.id, status: job.status, reused: false };
    }
    computeDedupeKey(type, params, parentId) {
        const payload = JSON.stringify({ type, params, parentId });
        return createHash('sha256').update(payload).digest('hex');
    }
    wakeWorkers(type) {
        const runtime = this.workers.get(type);
        if (!runtime)
            return;
        this.kickWorker(runtime);
    }
    kickWorker(runtime) {
        if (!this.running)
            return;
        const concurrency = runtime.config.concurrency ?? DEFAULT_CONCURRENCY;
        while (runtime.active < concurrency) {
            runtime.active += 1;
            this.processNext(runtime).finally(() => {
                runtime.active -= 1;
            });
        }
    }
    async processNext(runtime) {
        try {
            const job = await this.claimNextJob(runtime.config.type);
            if (!job) {
                await sleep(100);
                return;
            }
            await this.executeJob(runtime.config.handler, job);
        }
        catch (error) {
            this.logger.error({ err: error }, 'Queue processing error');
        }
    }
    async claimNextJob(type) {
        const now = new Date();
        for (;;) {
            const job = await this.prisma.job.findFirst({
                where: {
                    type,
                    status: 'QUEUED',
                    availableAt: { lte: now },
                },
                orderBy: { createdAt: 'asc' },
            });
            if (!job)
                return null;
            const updated = await this.prisma.job.updateMany({
                where: { id: job.id, status: 'QUEUED' },
                data: {
                    status: 'RUNNING',
                    attempts: job.attempts + 1,
                    startedAt: new Date(),
                },
            });
            if (updated.count === 0) {
                continue;
            }
            const updatedJob = { ...job, attempts: job.attempts + 1 };
            return this.materializeJob(updatedJob);
        }
    }
    async executeJob(handler, job) {
        const log = this.logger.child({ jobId: job.id, jobType: job.type });
        log.info('Processing job');
        let result;
        try {
            const params = job.params;
            result = await handler({ job, params });
            await this.prisma.job.update({
                where: { id: job.id },
                data: {
                    status: 'SUCCEEDED',
                    result: result?.result ? JSON.stringify(result.result) : null,
                    assetId: result?.assetId ?? null,
                    completedAt: new Date(),
                    lastSuccessAt: new Date(),
                },
            });
            jobCounter.inc({ type: job.type, status: 'SUCCEEDED' });
            log.info('Job succeeded');
        }
        catch (error) {
            log.error({ err: error }, 'Job failed');
            jobCounter.inc({ type: job.type, status: 'FAILED' });
            await this.handleFailure(job, error);
        }
    }
    async handleFailure(job, error) {
        const attempts = job.attempts;
        const maxAttempts = job.maxAttempts ?? 3;
        if (attempts >= maxAttempts) {
            await this.prisma.job.update({
                where: { id: job.id },
                data: {
                    status: 'FAILED',
                    error: error.message,
                    completedAt: new Date(),
                },
            });
            return;
        }
        const backoffMs = job.backoffMs ?? 2000;
        const delay = backoffMs * Math.pow(2, attempts - 1);
        await this.prisma.job.update({
            where: { id: job.id },
            data: {
                status: 'QUEUED',
                error: error.message,
                availableAt: new Date(Date.now() + delay),
            },
        });
    }
    materializeJob(record) {
        const parseJson = (value) => {
            if (!value)
                return null;
            try {
                return JSON.parse(value);
            }
            catch {
                return null;
            }
        };
        const toStatus = (value) => {
            const normalized = value ?? 'QUEUED';
            return (JOB_STATUS.includes(normalized) ? normalized : 'QUEUED');
        };
        const toType = (value) => {
            return (value && JOB_TYPES.includes(value)
                ? value
                : 'PLAN');
        };
        const status = toStatus(record.status);
        const type = toType(record.type);
        return {
            id: record.id,
            type,
            status,
            params: parseJson(record.params) ?? {},
            result: parseJson(record.result),
            error: record.error ?? null,
            attempts: record.attempts ?? 0,
            maxAttempts: record.maxAttempts ?? 3,
            parentId: record.parentId ?? null,
            assetId: record.assetId ?? null,
            apiKeyId: record.apiKeyId ?? null,
            dedupeKey: record.dedupeKey ?? null,
            lastSuccessAt: record.lastSuccessAt ?? null,
            availableAt: record.availableAt ?? new Date(),
            startedAt: record.startedAt ?? null,
            completedAt: record.completedAt ?? null,
            backoffMs: record.backoffMs ?? 2000,
            createdAt: record.createdAt ?? new Date(),
        };
    }
}
