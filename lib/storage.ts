/**
 * Cloudflare R2 Storage Integration
 * FREE egress bandwidth (saves 80-90% on bandwidth costs vs S3)
 * Compatible with S3 API
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize R2 client (S3-compatible)
const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT || process.env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'musewave-assets';
const CDN_URL = process.env.R2_PUBLIC_URL; // Optional: Custom domain for R2

interface UploadOptions {
    contentType?: string;
    cacheControl?: string;
    metadata?: Record<string, string>;
}

/**
 * Upload file to R2 storage
 * @param key - Object key/path in bucket
 * @param body - File buffer or stream
 * @param options - Upload options
 */
export async function uploadToR2(
    key: string,
    body: Buffer | Uint8Array | ReadableStream,
    options: UploadOptions = {}
): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: options.contentType || 'application/octet-stream',
        CacheControl: options.cacheControl || 'public, max-age=31536000', // Cache for 1 year
        Metadata: options.metadata,
    });

    await r2Client.send(command);

    // Return CDN URL if available, otherwise R2 public URL
    if (CDN_URL) {
        return `${CDN_URL}/${key}`;
    }

    return `https://${BUCKET_NAME}.r2.cloudflarestorage.com/${key}`;
}

/**
 * Get signed URL for private asset access (expires in 1 hour)
 */
export async function getSignedR2Url(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Check if file exists in R2
 */
export async function existsInR2(key: string): Promise<boolean> {
    try {
        const command = new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });
        await r2Client.send(command);
        return true;
    } catch {
        return false;
    }
}

/**
 * Generate storage key for track assets
 */
export function generateAssetKey(jobId: string, assetType: 'audio' | 'video' | 'image', extension: string): string {
    const timestamp = Date.now();
    return `tracks/${jobId}/${assetType}-${timestamp}.${extension}`;
}

/**
 * Upload track audio to R2 with caching
 */
export async function uploadTrackAudio(jobId: string, audioBuffer: Buffer): Promise<string> {
    const key = generateAssetKey(jobId, 'audio', 'wav');
    
    return await uploadToR2(key, audioBuffer, {
        contentType: 'audio/wav',
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: {
            jobId,
            assetType: 'audio',
            uploadedAt: new Date().toISOString(),
        },
    });
}

/**
 * Upload video to R2 with caching
 */
export async function uploadTrackVideo(jobId: string, videoBuffer: Buffer): Promise<string> {
    const key = generateAssetKey(jobId, 'video', 'mp4');
    
    return await uploadToR2(key, videoBuffer, {
        contentType: 'video/mp4',
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: {
            jobId,
            assetType: 'video',
            uploadedAt: new Date().toISOString(),
        },
    });
}

/**
 * Upload cover art to R2 with caching
 */
export async function uploadCoverArt(jobId: string, imageBuffer: Buffer): Promise<string> {
    const key = generateAssetKey(jobId, 'image', 'png');
    
    return await uploadToR2(key, imageBuffer, {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: {
            jobId,
            assetType: 'cover-art',
            uploadedAt: new Date().toISOString(),
        },
    });
}
