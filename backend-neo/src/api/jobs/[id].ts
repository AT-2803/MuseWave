import { FastifyPluginAsync } from 'fastify';

export const jobRoute: FastifyPluginAsync = async (app) => {
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as any;
    // TODO: Get job status
    reply.send({ jobId: id, status: 'completed', result: {} });
  });
};