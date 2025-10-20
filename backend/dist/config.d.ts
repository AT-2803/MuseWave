export declare const config: {
    DATABASE_URL: string;
    API_KEY: string;
    STORAGE_TYPE: "local" | "s3";
    ASSETS_DIR: string;
    PORT: number;
    LOG_LEVEL: "debug" | "info" | "warn" | "error";
    RATE_LIMIT_MAX: number;
    RATE_LIMIT_WINDOW_MS: number;
    QUEUE_CONCURRENCY: number;
    QUEUE_MAX_RETRIES: number;
    QUEUE_BACKOFF_MS: number;
    METRICS_ENABLED: boolean;
    GEMINI_API_KEY?: string | undefined;
    S3_BUCKET?: string | undefined;
    S3_REGION?: string | undefined;
    S3_ACCESS_KEY_ID?: string | undefined;
    S3_SECRET_ACCESS_KEY?: string | undefined;
};
