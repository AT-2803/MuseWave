import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { safetyService } from '../services/safetyService.js';
import { logger } from '../logger.js';

const generateSchema = z.object({
  prompt: z.string().min(1),
  duration: z.number().int().positive().max(300), // 5 minutes max
  includeVideo: z.boolean().default(false),
});

export const generateRoute: FastifyPluginAsync = async (app) => {
  app.post('/generate', async (request, reply) => {
    const body = request.body as any;
    const { prompt, duration, includeVideo } = body;

    // Safety check
    const safety = await safetyService.checkContent(prompt);
    if (!safety.safe) {
      return reply.code(400).send({ error: safety.reason });
    }

    // Enqueue job
    const jobId = await app.queue.enqueue('music_generation', {
      prompt,
      duration,
      includeVideo,
    }, {
      apiKeyId: request.apiKey?.id,
    });

    return reply.send({
      jobId,
      status: 'pending',
    });
  });
};