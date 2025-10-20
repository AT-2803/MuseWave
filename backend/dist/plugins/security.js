import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
export const securityPlugin = async (app) => {
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
