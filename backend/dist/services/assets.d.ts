export declare function saveAssetFromBuffer(options: {
    buffer: Buffer;
    mime: string;
    jobId: string;
    type: string;
    meta?: Record<string, unknown>;
    extension?: string;
    durationSec?: number;
}): Promise<{
    id: string;
    path: string;
}>;
