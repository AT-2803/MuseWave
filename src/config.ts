import path from 'node:path';
import { z } from 'zod';

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().min(1),
  ASSETS_DIR: z.string().default('./assets'),
  DEFAULT_API_KEY: z.string().default('dev-key-123'),
  RATE_LIMIT_PER_MIN: z.coerce.number().default(60),
  PROFANITY_DENYLIST: z
    .string()
    .default('fuck,shit,bitch')
    .transform((value) =>
      value
        .split(',')
        .map((word) => word.trim().toLowerCase())
        .filter(Boolean)
    ),
  USE_S3: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
});

type RawConfig = z.infer<typeof ConfigSchema>;

class Config {
  readonly port: number;
  readonly databaseUrl: string;
  readonly assetsDir: string;
  readonly defaultApiKey: string;
  readonly rateLimitPerMin: number;
  readonly profanityDenylist: string[];
  readonly useS3: boolean;
  readonly s3: {
    endpoint?: string;
    region?: string;
    bucket?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    forcePathStyle: boolean;
  };

  constructor(raw: RawConfig) {
    this.port = raw.PORT;
    this.databaseUrl = raw.DATABASE_URL;
    this.assetsDir = path.resolve(raw.ASSETS_DIR);
    this.defaultApiKey = raw.DEFAULT_API_KEY;
    this.rateLimitPerMin = raw.RATE_LIMIT_PER_MIN;
    this.profanityDenylist = raw.PROFANITY_DENYLIST;
    this.useS3 = raw.USE_S3 ?? false;
    this.s3 = {
      endpoint: raw.S3_ENDPOINT || undefined,
      region: raw.S3_REGION || undefined,
      bucket: raw.S3_BUCKET || undefined,
      accessKeyId: raw.S3_ACCESS_KEY_ID || undefined,
      secretAccessKey: raw.S3_SECRET_ACCESS_KEY || undefined,
      forcePathStyle: raw.S3_FORCE_PATH_STYLE ?? true,
    };
  }
}

let cachedConfig: Config | null = null;

export function loadConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = ConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${parsed.error.message}`);
  }

  cachedConfig = new Config(parsed.data);
  return cachedConfig;
}

export const config = loadConfig();
