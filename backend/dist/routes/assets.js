export const assetsRoute = async (app) => {
    app.get('/assets/:id', async (request, reply) => {
        const { id } = request.params;
        const asset = await app.prisma.asset.findUnique({
            where: { id },
        });
        if (!asset) {
            return reply.code(404).send({ error: 'Asset not found' });
        }
        // For local storage, stream the file
        if (asset.url.startsWith('file://')) {
            const filePath = asset.url.substring(7);
            const fs = await import('fs');
            const stream = fs.createReadStream(filePath);
            return reply.type('application/octet-stream').send(stream);
        }
        // For S3, redirect or proxy
        return reply.redirect(asset.url);
    });
};
