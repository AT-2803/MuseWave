import { ulid } from 'ulid';

export function generateId(): string {
  return ulid();
}

export function generateJobId(): string {
  return `job_${generateId()}`;
}

export function generateAssetId(): string {
  return `asset_${generateId()}`;
}

export function generateApiKey(): string {
  return `key_${generateId()}`;
}