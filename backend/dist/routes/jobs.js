export const jobsRoute = async (app) => {
    app.get('/jobs/:id', async (request, reply) => {
        const { id } = request.params;
        const job = await app.prisma.job.findUnique({
            where: { id },
            include: {
                assets: true,
            },
        });
        if (!job) {
            return reply.code(404).send({ error: 'Job not found' });
        }
        return reply.send({
            id: job.id,
            status: job.status,
            prompt: job.prompt,
            duration: job.duration,
            includeVideo: job.includeVideo,
            plan: job.plan,
            assets: job.assets.map(asset => ({
                id: asset.id,
                type: asset.type,
                url: asset.url,
                size: asset.size,
            })),
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
        });
    });
};
