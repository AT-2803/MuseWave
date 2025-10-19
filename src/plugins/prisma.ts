import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { logger } from '../logger';
import { config } from '../config';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = config.databaseUrl;
}

export const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

export type PrismaClientType = typeof prisma;

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClientType;
  }
}

export default fp(async function prismaPlugin(fastify: FastifyInstance) {
  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
    logger.info('Prisma disconnected');
  });
});
