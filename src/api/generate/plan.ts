import { FastifyPluginAsync } from 'fastify';

export const planRoute: FastifyPluginAsync = async (app) => {
  app.post('/plan', async (request, reply) => {
    const { musicPrompt, genres, durationSec, artistInspiration } = request.body as any;
    // Rule-based plan
    const bpm = { techno: 128, edm: 124, pop: 116, rock: 100, lofi: 80, ambient: 85 }[genres[0]] || 120;
    const key = 'C minor';
    const sections = ['Intro', 'Verse', 'Chorus', 'Outro'];
    const plan = { title: musicPrompt, genre: genres[0], bpm, key, sections, duration_sec: durationSec };
    reply.send({ plan, bpm, key, sections });
  });
};