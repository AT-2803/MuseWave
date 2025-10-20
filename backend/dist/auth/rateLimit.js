import { config } from '../config.js';
import { rateLimitCounter } from '../metrics.js';
export const rateLimitPlugin = async (app) => {
    app.addHook('onRequest', async (request, reply) => {
        if (!request.apiKey)
            return; // Skip if no API key (should be handled by auth)
        const apiKeyId = request.apiKey.id;
        const windowStart = new Date();
        windowStart.setMilliseconds(0); // Round to minute
        // Get current rate limit record
        let rateLimit = await app.prisma.rateLimit.findUnique({
            where: {
                apiKeyId_windowStart: {
                    apiKeyId,
                    windowStart,
                },
            },
        });
        if (!rateLimit) {
            rateLimit = await app.prisma.rateLimit.create({
                data: {
                    apiKeyId,
                    windowStart,
                    requestCount: 0,
                },
            });
        }
        if (rateLimit.requestCount >= config.RATE_LIMIT_MAX) {
            rateLimitCounter.inc();
            return reply.code(429).send({ error: 'Rate limit exceeded' });
        }
        // Increment count
        await app.prisma.rateLimit.update({
            where: {
                apiKeyId_windowStart: {
                    apiKeyId,
                    windowStart,
                },
            },
            data: {
                requestCount: { increment: 1 },
            },
        });
    });
};
