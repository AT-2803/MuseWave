import { Counter, Registry, collectDefaultMetrics, Gauge } from 'prom-client';

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const requestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

export const jobCounter = new Counter({
  name: 'jobs_processed_total',
  help: 'Total jobs processed',
  labelNames: ['type', 'status'],
  registers: [registry],
});

export const rateLimitCounter = new Counter({
  name: 'rate_limit_rejections_total',
  help: 'Total rate limit rejections',
  registers: [registry],
});

export const ffmpegGauge = new Gauge({
  name: 'ffmpeg_available',
  help: 'Indicates if ffmpeg binary is reachable',
  registers: [registry],
});
