import { FastifyPluginAsync } from 'fastify';

export const metricsRoute: FastifyPluginAsync = async (app) => {
  app.get('/metrics', async (request, reply) => {
    // TODO: Get metrics
    reply.send({ requests: 0, errors: 0 });
  });
};