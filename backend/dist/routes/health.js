export const healthRoute = async (app) => {
    app.get('/health', async (request, reply) => {
        // Check database connection
        try {
            await app.prisma.$queryRaw `SELECT 1`;
        }
        catch (error) {
            return reply.code(503).send({ status: 'unhealthy', database: 'down' });
        }
        // Check ffmpeg availability
        const ffmpegOk = app.ffmpeg.available;
        return reply.send({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'up',
            ffmpeg: ffmpegOk ? 'available' : 'unavailable',
        });
    });
};
