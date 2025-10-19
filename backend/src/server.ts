import fastify from 'fastify';
import { logger } from './logger.js';
import { metricsPlugin } from './metrics.js';
import { prismaPlugin } from './plugins/prisma.js';
import { storagePlugin } from './plugins/storage.js';
import { ffmpegPlugin } from './plugins/ffmpeg.js';
import { securityPlugin } from './plugins/security.js';
import { apiKeyAuth } from './auth/apiKey.js';
import { rateLimitPlugin } from './auth/rateLimit.js';
import { healthRoute } from './routes/health.js';
import { metricsRoute } from './routes/metrics.js';
import { generateRoute } from './routes/generate.js';
import { jobsRoute } from './routes/jobs.js';
import { assetsRoute } from './routes/assets.js';

export async function createServer() {
  const app = fastify({
    logger,
    disableRequestLogging: false,
  });

  // Register plugins
  await app.register(metricsPlugin);
  await app.register(prismaPlugin);
  await app.register(storagePlugin);
  await app.register(ffmpegPlugin);
  await app.register(securityPlugin);

  // Auth and rate limiting
  await app.register(apiKeyAuth);
  await app.register(rateLimitPlugin);

  // Routes
  await app.register(healthRoute);
  await app.register(metricsRoute);
  await app.register(generateRoute);
  await app.register(jobsRoute);
  await app.register(assetsRoute);

  return app;
}