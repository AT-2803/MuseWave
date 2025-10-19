import { FastifyPluginAsync } from 'fastify';
import { register } from 'prom-client';

export const metricsRoute: FastifyPluginAsync = async (app) => {
  app.get('/metrics', async (request, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });
};