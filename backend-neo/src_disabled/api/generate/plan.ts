import { FastifyPluginAsync } from 'fastify';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export const planRoute: FastifyPluginAsync = async (app) => {
  app.post('/plan', async (request, reply) => {
    const { musicPrompt, genres, durationSec, artistInspiration } = request.body as { musicPrompt: string; genres: string[]; durationSec: number; artistInspiration: string };

    const prompt = `Generate a detailed music plan for a song with the following details:
- Prompt: ${musicPrompt}
- Genres: ${genres.join(', ')}
- Duration: ${durationSec} seconds
- Artist Inspiration: ${artistInspiration}

Provide a JSON object with: title, genre, bpm, key, sections (array), duration_sec, and any other creative details.`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const plan = JSON.parse(text);
      reply.send(plan);
    } catch (error) {
      console.error('Error generating plan:', error);
      reply.status(500).send({ error: 'Failed to generate music plan' });
    }
  });
};