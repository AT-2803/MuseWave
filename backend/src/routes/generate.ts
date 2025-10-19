import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const generateSchema = z.object({
  prompt: z.string().min(1),
  duration: z.number().int().positive().max(300), // 5 minutes max
  includeVideo: z.boolean().default(false),
});

export const generateRoute: FastifyPluginAsync = async (app) => {
  app.post('/generate', {
    schema: {
      body: generateSchema,
    },
  }, async (request, reply) => {
    const { prompt, duration, includeVideo } = request.body as z.infer<typeof generateSchema>;

    // Create job
    const job = await app.prisma.job.create({
      data: {
        prompt,
        duration,
        includeVideo,
        status: 'pending',
      },
    });

    // TODO: Enqueue job for processing

    return reply.send({
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
    });
  });
};