import { ulid } from 'ulid';
export function generateId() {
    return ulid();
}
export function generateJobId() {
    return `job_${generateId()}`;
}
export function generateAssetId() {
    return `asset_${generateId()}`;
}
export function generateApiKey() {
    return `key_${generateId()}`;
}
