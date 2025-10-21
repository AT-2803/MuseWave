import { FastifyPluginAsync } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export const audioRoute: FastifyPluginAsync = async (app) => {
  app.post('/audio', async (request, reply) => {
    const { planId, jobId, durationSec = 30 } = request.body as any;

    try {
      // Generate a simple sine wave audio using ffmpeg
      const outputPath = path.join(process.cwd(), 'assets', `audio-${Date.now()}.wav`);
      const command = `ffmpeg -f lavfi -i "sine=frequency=440:duration=${durationSec}" -acodec pcm_s16le -ar 44100 ${outputPath}`;

      await execAsync(command);

      // In a real app, upload to storage and return URL
      const audioUrl = `/assets/audio-${Date.now()}.wav`;

      reply.send({ jobId: jobId || 'audio-job-123', status: 'completed', audioUrl });
    } catch (error) {
      console.error('Error generating audio:', error);
      reply.status(500).send({ error: 'Failed to generate audio' });
    }
  });
};