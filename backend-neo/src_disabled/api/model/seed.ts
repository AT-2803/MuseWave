import { FastifyPluginAsync } from 'fastify';
import { trainModel } from '../../lib/model/markov.js';

export const seedRoute: FastifyPluginAsync = async (app) => {
  app.post('/seed', async (request, reply) => {
    const { name, midiFilesBase64, style } = request.body as any;
    const model = await trainModel(name, midiFilesBase64 || [], style);
    reply.send({ modelId: model.id });
  });
};