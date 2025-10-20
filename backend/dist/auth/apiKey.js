export const apiKeyAuth = async (app) => {
    app.addHook('onRequest', async (request, reply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.code(401).send({ error: 'Missing or invalid authorization header' });
        }
        const apiKey = authHeader.substring(7); // Remove 'Bearer '
        // Verify API key exists
        const keyRecord = await app.prisma.apiKey.findUnique({
            where: { key: apiKey },
        });
        if (!keyRecord) {
            return reply.code(401).send({ error: 'Invalid API key' });
        }
        // Decorate request with API key info
        request.apiKey = keyRecord;
    });
};
