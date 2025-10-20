import { register } from 'prom-client';
export const metricsRoute = async (app) => {
    app.get('/metrics', async (request, reply) => {
        reply.header('Content-Type', register.contentType);
        return register.metrics();
    });
};
