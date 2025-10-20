import { PrismaClient } from '@prisma/client';
declare module 'fastify' {
    interface FastifyInstance {
        prisma: PrismaClient;
    }
}
export declare function createServer(): Promise<import("fastify").FastifyInstance<import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("pino").Logger<never, boolean>, import("fastify").FastifyTypeProviderDefault>>;
