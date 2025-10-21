import { FastifyPluginAsync } from 'fastify';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export const pipelineRoute: FastifyPluginAsync = async (app) => {
  app.post('/pipeline', async (request, reply) => {
    const { musicPrompt, genres, durationSec, artistInspiration } = request.body as any;

    try {
      // Step 1: Generate plan
      const planPrompt = `Generate a detailed music plan for a song with the following details:
- Prompt: ${musicPrompt}
- Genres: ${genres.join(', ')}
- Duration: ${durationSec} seconds
- Artist Inspiration: ${artistInspiration}

Provide a JSON object with: title, genre, bpm, key, sections (array), duration_sec.`;

      const planResult = await model.generateContent(planPrompt);
      const planResponse = await planResult.response;
      const planText = planResponse.text();
      const plan = JSON.parse(planText);

      // Step 2: Generate audio
      const audioPath = path.join(process.cwd(), 'assets', `audio-${Date.now()}.wav`);
      const audioCommand = `ffmpeg -f lavfi -i "sine=frequency=440:duration=${durationSec}" -acodec pcm_s16le -ar 44100 ${audioPath}`;
      await execAsync(audioCommand);

      // Step 3: Generate vocals
      const vocalsPath = path.join(process.cwd(), 'assets', `vocals-${Date.now()}.wav`);
      const vocalsCommand = `ffmpeg -f lavfi -i "sine=frequency=660:duration=${Math.min(durationSec, 10)}" -acodec pcm_s16le -ar 44100 ${vocalsPath}`;
      await execAsync(vocalsCommand);

      // Step 4: Mix
      const mixPath = path.join(process.cwd(), 'assets', `mix-${Date.now()}.wav`);
      const mixCommand = `ffmpeg -i ${audioPath} -i ${vocalsPath} -filter_complex "[0:a][1:a]amix=inputs=2:duration=first[aout]" -map "[aout]" ${mixPath}`;
      await execAsync(mixCommand);

      // Step 5: Generate video
      const imagePath = path.join(process.cwd(), 'public', 'default-image.jpg');
      const videoPath = path.join(process.cwd(), 'assets', `video-${Date.now()}.mp4`);
      const videoCommand = `ffmpeg -loop 1 -i ${imagePath} -i ${mixPath} -c:v libx264 -c:a aac -shortest ${videoPath}`;
      await execAsync(videoCommand);

      const videoUrl = `/assets/video-${Date.now()}.mp4`;

      reply.send({ jobId: 'pipeline-job-123', status: 'completed', plan, videoUrl });
    } catch (error) {
      console.error('Error in pipeline:', error);
      reply.status(500).send({ error: 'Failed to complete pipeline' });
    }
  });
};