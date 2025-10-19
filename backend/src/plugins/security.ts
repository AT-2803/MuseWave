import { FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

export const securityPlugin: FastifyPluginAsync = async (app) => {
  // CORS
  await app.register(cors, {
    origin: true, // Allow all origins for now
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: false, // Disable CSP for API
  });
};