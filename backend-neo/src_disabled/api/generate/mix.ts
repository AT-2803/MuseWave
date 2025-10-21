import { FastifyPluginAsync } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export const mixRoute: FastifyPluginAsync = async (app) => {
  app.post('/mix', async (request, reply) => {
    const { audioUrl, vocalsUrl, jobId } = request.body as any;

    try {
      // Assume URLs are local paths for simplicity
      const audioPath = path.join(process.cwd(), 'assets', path.basename(audioUrl));
      const vocalsPath = path.join(process.cwd(), 'assets', path.basename(vocalsUrl));
      const outputPath = path.join(process.cwd(), 'assets', `mix-${Date.now()}.wav`);

      // Mix audio and vocals
      const command = `ffmpeg -i ${audioPath} -i ${vocalsPath} -filter_complex "[0:a][1:a]amix=inputs=2:duration=first[aout]" -map "[aout]" ${outputPath}`;

      await execAsync(command);

      const mixUrl = `/assets/mix-${Date.now()}.wav`;

      reply.send({ jobId: jobId || 'mix-job-123', status: 'completed', mixUrl });
    } catch (error) {
      console.error('Error mixing audio:', error);
      reply.status(500).send({ error: 'Failed to mix audio' });
    }
  });
};