import { register, collectDefaultMetrics, Gauge, Counter } from 'prom-client';

collectDefaultMetrics();

export const httpRequests = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const jobCreated = new Counter({
  name: 'job_created_total',
  help: 'Total jobs created',
  labelNames: ['type'],
});

export const jobSucceeded = new Counter({
  name: 'job_succeeded_total',
  help: 'Total jobs succeeded',
  labelNames: ['type'],
});

export const jobFailed = new Counter({
  name: 'job_failed_total',
  help: 'Total jobs failed',
  labelNames: ['type'],
});

export const ffmpegErrors = new Counter({
  name: 'ffmpeg_errors_total',
  help: 'Total ffmpeg errors',
});

export const rateLimitRejects = new Counter({
  name: 'rate_limit_rejects_total',
  help: 'Total rate limit rejections',
});

export async function incrementRequests(): Promise<void> {
  httpRequests.inc();
}