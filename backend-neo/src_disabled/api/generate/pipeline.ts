import { FastifyPluginAsync } from 'fastify';

export const pipelineRoute: FastifyPluginAsync = async (app) => {
  app.post('/pipeline', async (request, reply) => {
    const { musicPrompt, genres, durationSec, artistInspiration } = request.body as any;
    // TODO: Implement full pipeline
    reply.send({ jobId: 'pipeline-job-123', status: 'queued' });
  });
};