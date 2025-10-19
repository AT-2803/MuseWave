import fp from 'fastify-plugin';
import { promises as fs, createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import type { FastifyInstance } from 'fastify';
import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config';
import { logger } from '../logger';

export interface StorageStat {
  size: number;
  modified: Date;
}

export interface StorageService {
  writeBuffer(key: string, data: Buffer): Promise<string>;
  writeStream(key: string, stream: Readable): Promise<string>;
  writeText(key: string, text: string): Promise<string>;
  createReadStream(key: string): Promise<Readable>;
  stat(key: string): Promise<StorageStat>;
  resolvePath(key: string): string;
}

class LocalStorageService implements StorageService {
  constructor(private baseDir: string) {
    fs.mkdir(this.baseDir, { recursive: true }).catch((error) => {
      logger.error({ error }, 'Failed to create assets directory');
    });
  }

  private async ensureDir(filePath: string) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  }

  resolvePath(key: string): string {
    return path.join(this.baseDir, key);
  }

  async writeBuffer(key: string, data: Buffer): Promise<string> {
    const absolute = this.resolvePath(key);
    await this.ensureDir(absolute);
    await fs.writeFile(absolute, data);
    return absolute;
  }

  async writeStream(key: string, stream: Readable): Promise<string> {
    const absolute = this.resolvePath(key);
    await this.ensureDir(absolute);
    const target = createWriteStream(absolute);
    await pipeline(stream, target);
    return absolute;
  }

  async writeText(key: string, text: string): Promise<string> {
    return this.writeBuffer(key, Buffer.from(text));
  }

  async createReadStream(key: string): Promise<Readable> {
    const absolute = this.resolvePath(key);
    return createReadStream(absolute);
  }

  async stat(key: string): Promise<StorageStat> {
    const absolute = this.resolvePath(key);
    const stats = await fs.stat(absolute);
    return {
      size: stats.size,
      modified: stats.mtime,
    };
  }
}

class S3StorageService implements StorageService {
  private client: S3Client;

  constructor(private bucket: string, private prefix: string = '') {
    this.client = new S3Client({
      endpoint: config.s3.endpoint,
      region: config.s3.region,
      forcePathStyle: config.s3.forcePathStyle,
      credentials:
        config.s3.accessKeyId && config.s3.secretAccessKey
          ? {
              accessKeyId: config.s3.accessKeyId,
              secretAccessKey: config.s3.secretAccessKey,
            }
          : undefined,
    });
  }

  private makeKey(key: string): string {
    const clean = key.startsWith('/') ? key.slice(1) : key;
    return this.prefix ? `${this.prefix.replace(/\/$/, '')}/${clean}` : clean;
  }

  resolvePath(key: string): string {
    return this.makeKey(key);
  }

  async writeBuffer(key: string, data: Buffer): Promise<string> {
    const Key = this.makeKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key,
        Body: data,
      })
    );
    return Key;
  }

  async writeStream(key: string, stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return this.writeBuffer(key, Buffer.concat(chunks));
  }

  async writeText(key: string, text: string): Promise<string> {
    return this.writeBuffer(key, Buffer.from(text));
  }

  async createReadStream(key: string): Promise<Readable> {
    const Key = this.makeKey(key);
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key })
    );
    if (!result.Body || !(result.Body as Readable).pipe) {
      throw new Error('S3 returned empty body');
    }
    return result.Body as Readable;
  }

  async stat(key: string): Promise<StorageStat> {
    const Key = this.makeKey(key);
    const result = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key })
    );
    if (!result.ContentLength || !result.LastModified) {
      throw new Error('S3 object metadata missing');
    }
    return {
      size: Number(result.ContentLength),
      modified: result.LastModified,
    };
  }
}

let storageService: StorageService | null = null;

function buildStorage(): StorageService {
  if (storageService) {
    return storageService;
  }

  if (config.useS3) {
    if (!config.s3.bucket) {
      throw new Error('USE_S3=true but S3_BUCKET not provided');
    }
    storageService = new S3StorageService(config.s3.bucket, 'assets');
    logger.info('Using S3 storage backend');
  } else {
    storageService = new LocalStorageService(config.assetsDir);
    logger.info({ assetsDir: config.assetsDir }, 'Using local storage backend');
  }

  return storageService;
}

export const storage = buildStorage();

declare module 'fastify' {
  interface FastifyInstance {
    storage: StorageService;
  }
}

export default fp(async function storagePlugin(fastify: FastifyInstance) {
  fastify.decorate('storage', storage);
});
