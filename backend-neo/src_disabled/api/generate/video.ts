import { FastifyPluginAsync } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export const videoRoute: FastifyPluginAsync = async (app) => {
  app.post('/video', async (request, reply) => {
    const { mixUrl, jobId } = request.body as any;

    try {
      const audioPath = path.join(process.cwd(), 'assets', path.basename(mixUrl));
      const imagePath = path.join(process.cwd(), 'public', 'default-image.jpg'); // Assume a default image exists
      const outputPath = path.join(process.cwd(), 'assets', `video-${Date.now()}.mp4`);

      // Create video from image and audio
      const command = `ffmpeg -loop 1 -i ${imagePath} -i ${audioPath} -c:v libx264 -c:a aac -shortest ${outputPath}`;

      await execAsync(command);

      const videoUrl = `/assets/video-${Date.now()}.mp4`;

      reply.send({ jobId: jobId || 'video-job-123', status: 'completed', videoUrl });
    } catch (error) {
      console.error('Error generating video:', error);
      reply.status(500).send({ error: 'Failed to generate video' });
    }
  });
};