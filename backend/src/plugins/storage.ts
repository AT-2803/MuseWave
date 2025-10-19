import { FastifyPluginAsync } from 'fastify';
import { S3Client } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';

interface StorageService {
  upload(key: string, data: Buffer): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

class LocalStorage implements StorageService {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  async upload(key: string, data: Buffer): Promise<string> {
    const filePath = path.join(this.baseDir, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    return `file://${filePath}`;
  }

  async download(key: string): Promise<Buffer> {
    const filePath = path.join(this.baseDir, key);
    return fs.readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    await fs.unlink(filePath);
  }

  getUrl(key: string): string {
    return `file://${path.join(this.baseDir, key)}`;
  }
}

class S3Storage implements StorageService {
  private s3: S3Client;
  private bucket: string;

  constructor(bucket: string, region: string, accessKeyId: string, secretAccessKey: string) {
    this.bucket = bucket;
    this.s3 = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async upload(key: string, data: Buffer): Promise<string> {
    // Implement S3 upload
    // For now, return placeholder
    return `s3://${this.bucket}/${key}`;
  }

  async download(key: string): Promise<Buffer> {
    // Implement S3 download
    throw new Error('S3 download not implemented');
  }

  async delete(key: string): Promise<void> {
    // Implement S3 delete
    throw new Error('S3 delete not implemented');
  }

  getUrl(key: string): string {
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }
}

export const storagePlugin: FastifyPluginAsync = async (app) => {
  let storage: StorageService;

  if (config.STORAGE_TYPE === 's3') {
    if (!config.S3_BUCKET || !config.S3_REGION || !config.S3_ACCESS_KEY_ID || !config.S3_SECRET_ACCESS_KEY) {
      throw new Error('S3 configuration incomplete');
    }
    storage = new S3Storage(config.S3_BUCKET, config.S3_REGION, config.S3_ACCESS_KEY_ID, config.S3_SECRET_ACCESS_KEY);
  } else {
    storage = new LocalStorage(config.ASSETS_DIR);
  }

  app.decorate('storage', storage);
};