import { z } from 'zod';
const configSchema = z.object({
    DATABASE_URL: z.string().url(),
    API_KEY: z.string().min(1),
    GEMINI_API_KEY: z.string().min(1).optional(),
    STORAGE_TYPE: z.enum(['local', 's3']).default('local'),
    ASSETS_DIR: z.string().default('./assets'),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(2),
    QUEUE_MAX_RETRIES: z.coerce.number().int().positive().default(3),
    QUEUE_BACKOFF_MS: z.coerce.number().int().positive().default(1000),
    METRICS_ENABLED: z.coerce.boolean().default(true),
});
export const config = configSchema.parse(process.env);
