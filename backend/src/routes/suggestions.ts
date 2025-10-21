import { FastifyPluginAsync } from 'fastify';
import { enhancePrompt, suggestGenres, suggestArtists, suggestLanguages, enhanceLyrics } from '../services/geminiService';

export const suggestionRoute: FastifyPluginAsync = async (app) => {
  app.post('/enhance-prompt', async (request, reply) => {
    try {
      const result = await enhancePrompt(request.body as any);
      reply.send(result);
    } catch (error) {
      reply.code(500).send({ error: (error as Error).message });
    }
  });

  app.post('/suggest-genres', async (request, reply) => {
    try {
      const result = await suggestGenres(request.body as any);
      reply.send(result);
    } catch (error) {
      reply.code(500).send({ error: (error as Error).message });
    }
  });

  app.post('/suggest-artists', async (request, reply) => {
    try {
      const result = await suggestArtists(request.body as any);
      reply.send(result);
    } catch (error) {
      reply.code(500).send({ error: (error as Error).message });
    }
  });

  app.post('/suggest-languages', async (request, reply) => {
    try {
      const result = await suggestLanguages(request.body as any);
      reply.send(result);
    } catch (error) {
      reply.code(500).send({ error: (error as Error).message });
    }
  });

  app.post('/enhance-lyrics', async (request, reply) => {
    try {
      const result = await enhanceLyrics(request.body as any);
      reply.send(result);
    } catch (error) {
      reply.code(500).send({ error: (error as Error).message });
    }
  });
};