import { FastifyPluginAsync } from 'fastify';

export const videoRoute: FastifyPluginAsync = async (app) => {
  app.post('/video', async (request, reply) => {
    const { mixJobId, jobId } = request.body as any;
    // TODO: Implement video generation
    reply.send({ jobId: jobId || 'video-job-123', status: 'queued' });
  });
};