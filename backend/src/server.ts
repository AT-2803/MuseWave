import fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';
import { metricsPlugin } from './metrics.js';
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
import { Queue } from './queue/queue.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export async function createServer() {
  const app = fastify({
    logger,
    disableRequestLogging: false,
  });

  // Register plugins
  await app.register(metricsPlugin);
  await app.register(storagePlugin);
  await app.register(ffmpegPlugin);
  await app.register(securityPlugin);

  // Auth and rate limiting
  await app.register(apiKeyAuth);
  await app.register(rateLimitPlugin);

  // Initialize prisma
  const prisma = new PrismaClient();
  app.decorate('prisma', prisma);

  // Debug: Check if prisma is available
  console.log('DEBUG: app.prisma exists =', !!app.prisma);

  // Initialize queue
  const queue = new Queue(prisma);
  queue.start();

  // Make queue available in routes
  app.decorate('queue', queue);

  // Routes
  await app.register(healthRoute);
  await app.register(metricsRoute);
  await app.register(generateRoute);
  await app.register(jobsRoute);
  await app.register(assetsRoute);

  // Graceful shutdown
  app.addHook('onClose', () => {
    queue.stop();
  });

  return app;
}