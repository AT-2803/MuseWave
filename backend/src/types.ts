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

export const JOB_TYPES = ['PLAN', 'AUDIO', 'VOCALS', 'MIX', 'VIDEO'] as const;
export type JobType = (typeof JOB_TYPES)[number];
export const JOB_TYPE = {
  PLAN: 'PLAN' as JobType,
  AUDIO: 'AUDIO' as JobType,
  VOCALS: 'VOCALS' as JobType,
  MIX: 'MIX' as JobType,
  VIDEO: 'VIDEO' as JobType,
} as const;

export const JOB_STATUS = ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'] as const;
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
