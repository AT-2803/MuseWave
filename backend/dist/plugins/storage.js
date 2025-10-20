import { S3Client } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
class LocalStorage {
    baseDir;
    constructor(baseDir) {
        this.baseDir = baseDir;
    }
    async upload(key, data) {
        const filePath = path.join(this.baseDir, key);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, data);
        return `file://${filePath}`;
    }
    async download(key) {
        const filePath = path.join(this.baseDir, key);
        return fs.readFile(filePath);
    }
    async delete(key) {
        const filePath = path.join(this.baseDir, key);
        await fs.unlink(filePath);
    }
    getUrl(key) {
        return `file://${path.join(this.baseDir, key)}`;
    }
}
class S3Storage {
    s3;
    bucket;
    constructor(bucket, region, accessKeyId, secretAccessKey) {
        this.bucket = bucket;
        this.s3 = new S3Client({
            region,
            credentials: { accessKeyId, secretAccessKey },
        });
    }
    async upload(key, data) {
        // Implement S3 upload
        // For now, return placeholder
        return `s3://${this.bucket}/${key}`;
    }
    async download(key) {
        // Implement S3 download
        throw new Error('S3 download not implemented');
    }
    async delete(key) {
        // Implement S3 delete
        throw new Error('S3 delete not implemented');
    }
    getUrl(key) {
        return `https://${this.bucket}.s3.amazonaws.com/${key}`;
    }
}
export const storagePlugin = async (app) => {
    let storage;
    if (config.STORAGE_TYPE === 's3') {
        if (!config.S3_BUCKET || !config.S3_REGION || !config.S3_ACCESS_KEY_ID || !config.S3_SECRET_ACCESS_KEY) {
            throw new Error('S3 configuration incomplete');
        }
        storage = new S3Storage(config.S3_BUCKET, config.S3_REGION, config.S3_ACCESS_KEY_ID, config.S3_SECRET_ACCESS_KEY);
    }
    else {
        storage = new LocalStorage(config.ASSETS_DIR);
    }
    app.decorate('storage', storage);
};
