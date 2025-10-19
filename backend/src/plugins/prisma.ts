import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';

export const prismaPlugin: FastifyPluginAsync = async (app) => {
  console.log('DEBUG: prismaPlugin called');
  const prisma = new PrismaClient();
  console.log('DEBUG: PrismaClient created');

  // Decorate app with prisma
  app.decorate('prisma', prisma);
  console.log('DEBUG: app decorated with prisma');

  // Close connection on app close
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
};