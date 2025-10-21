import { FastifyPluginAsync } from 'fastify';

export const mixRoute: FastifyPluginAsync = async (app) => {
  app.post('/mix', async (request, reply) => {
    const { audioJobId, vocalsJobId, jobId } = request.body as any;
    // TODO: Implement mixing
    reply.send({ jobId: jobId || 'mix-job-123', status: 'queued' });
  });
};