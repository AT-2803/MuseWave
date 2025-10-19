import { register, collectDefaultMetrics, Gauge, Counter } from 'prom-client';
import { FastifyPluginAsync } from 'fastify';
import { config } from './config.js';

// Enable default metrics
collectDefaultMetrics();

// Custom metrics
export const jobDuration = new Gauge({
  name: 'musewave_job_duration_seconds',
  help: 'Duration of job processing in seconds',
  labelNames: ['status'],
});

export const jobCount = new Counter({
  name: 'musewave_jobs_total',
  help: 'Total number of jobs processed',
  labelNames: ['status'],
});

export const requestCount = new Counter({
  name: 'musewave_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const queueSize = new Gauge({
  name: 'musewave_queue_size',
  help: 'Current queue size',
});

export const rateLimitCounter = new Counter({
  name: 'musewave_rate_limit_rejections_total',
  help: 'Total rate limit rejections',
});

export const ffmpegGauge = new Gauge({
  name: 'musewave_ffmpeg_available',
  help: 'Indicates if ffmpeg binary is reachable',
});

// Fastify plugin
export const metricsPlugin: FastifyPluginAsync = async (app) => {
  if (!config.METRICS_ENABLED) return;

  // Decorate with metrics
  app.decorate('metrics', { jobDuration, jobCount, requestCount, queueSize, rateLimitCounter, ffmpegGauge });

  // Middleware to count requests
  app.addHook('onResponse', (request, reply) => {
    const route = request.routeOptions?.url || request.url || 'unknown';
    requestCount.inc({
      method: request.method,
      route,
      status: String(reply.statusCode),
    });
  });
};
