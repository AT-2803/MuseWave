import { FastifyPluginAsync } from 'fastify';

export const vocalsRoute: FastifyPluginAsync = async (app) => {
  app.post('/vocals', async (request, reply) => {
    const { planId, jobId } = request.body as any;
    // TODO: Implement vocals generation
    reply.send({ jobId: jobId || 'vocals-job-123', status: 'queued' });
  });
};