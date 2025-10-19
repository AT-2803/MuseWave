import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';

export const prismaPlugin: FastifyPluginAsync = async (app) => {
  const prisma = new PrismaClient();

  // Decorate app with prisma
  app.decorate('prisma', prisma);

  // Close connection on app close
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
};