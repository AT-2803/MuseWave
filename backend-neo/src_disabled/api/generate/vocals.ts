import { FastifyPluginAsync } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export const vocalsRoute: FastifyPluginAsync = async (app) => {
  app.post('/vocals', async (request, reply) => {
    const { planId, jobId, durationSec = 10 } = request.body as any;

    try {
      // Generate vocals-like audio (higher frequency sine wave)
      const outputPath = path.join(process.cwd(), 'assets', `vocals-${Date.now()}.wav`);
      const command = `ffmpeg -f lavfi -i "sine=frequency=660:duration=${durationSec}" -acodec pcm_s16le -ar 44100 ${outputPath}`;

      await execAsync(command);

      const vocalsUrl = `/assets/vocals-${Date.now()}.wav`;

      reply.send({ jobId: jobId || 'vocals-job-123', status: 'completed', vocalsUrl });
    } catch (error) {
      console.error('Error generating vocals:', error);
      reply.status(500).send({ error: 'Failed to generate vocals' });
    }
  });
};