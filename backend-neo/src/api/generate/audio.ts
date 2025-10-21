import { FastifyPluginAsync } from 'fastify';

export const audioRoute: FastifyPluginAsync = async (app) => {
  app.post('/audio', async (request, reply) => {
    const { planId, jobId } = request.body as any;
    // TODO: Implement audio generation
    reply.send({ jobId: jobId || 'audio-job-123', status: 'queued' });
  });
};