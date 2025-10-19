import Fastify from 'fastify';
import cors from '@fastify/cors';
import { logger } from './logger';
import prismaPlugin from './plugins/prisma';
import storagePlugin from './plugins/storage';
import securityPlugin from './plugins/security';
import { httpRequestCounter, httpRequestDuration } from './metrics';
import healthRoute from './routes/health';
import metricsRoute from './routes/metrics';
import jobsRoute from './routes/jobs';
import assetsRoute from './routes/assets';
import generateRoute from './routes/generate';
import rateLimitPlugin from './auth/rateLimit';
import apiKeyPlugin from './auth/apiKey';

export async function buildServer() {
  const fastify = Fastify({ logger });

  await fastify.register(cors, { origin: true });
  await fastify.register(securityPlugin);
  await fastify.register(prismaPlugin);
  await fastify.register(storagePlugin);

  fastify.addHook('onRequest', async (request, reply) => {
    (request as any)._metricsEnd = httpRequestDuration.startTimer({
      method: request.method,
      route: request.routerPath ?? request.url,
    });
    reply.header('content-security-policy', "default-src 'none'; frame-ancestors 'none';");
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const endTimer = (request as any)._metricsEnd;
    if (typeof endTimer === 'function') {
      endTimer();
    }
    httpRequestCounter.inc({
      route: request.routerPath ?? request.url,
      method: request.method,
      status: reply.statusCode,
    });
  });

  await fastify.register(metricsRoute);
  await fastify.register(healthRoute);
  await fastify.register(rateLimitPlugin);
  await fastify.register(apiKeyPlugin);
  await fastify.register(generateRoute, { prefix: '/v1' });
  await fastify.register(jobsRoute, { prefix: '/v1' });
  await fastify.register(assetsRoute, { prefix: '/v1' });

  return fastify;
}
