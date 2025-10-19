import { FastifyPluginAsync } from 'fastify';

export const assetsRoute: FastifyPluginAsync = async (app) => {
  app.get('/assets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const asset = await app.prisma.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      return reply.code(404).send({ error: 'Asset not found' });
    }

    // For local storage, stream the file
    if (asset.url.startsWith('file://')) {
      const filePath = asset.url.substring(7);
      return reply.sendFile(filePath);
    }

    // For S3, redirect or proxy
    return reply.redirect(asset.url);
  });
};
