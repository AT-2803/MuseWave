import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  AUTH_SECRET: z.string().min(8),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(60),
  ASSETS_DIR: z.string().default('./assets'),
  USE_S3: z.coerce.boolean().default(false),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
