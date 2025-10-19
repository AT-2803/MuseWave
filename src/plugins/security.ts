import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';

export default fp(async function securityPlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    if (!request.headers['x-request-id']) {
      const id = randomUUID();
      request.headers['x-request-id'] = id;
      reply.header('x-request-id', id);
    } else {
      reply.header('x-request-id', request.headers['x-request-id']);
    }
  });

  fastify.addHook('onSend', async (_request, reply) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('x-frame-options', 'DENY');
    reply.header('referrer-policy', 'no-referrer');
  });
});
