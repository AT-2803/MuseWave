import { FastifyPluginAsync } from 'fastify';

export const assetRoute: FastifyPluginAsync = async (app) => {
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as any;
    // TODO: Get asset
    reply.send({ assetId: id, data: 'asset-data' });
  });
};