import { env } from './env';
export function apiAuth(prisma) {
    return async (req, res, next) => {
        const header = req.header('authorization');
        if (!header?.startsWith('Bearer ')) {
            return res.status(403).json({ error: { code: 'UNAUTHORIZED', message: 'Missing bearer token' } });
        }
        const token = header.slice('Bearer '.length).trim();
        const record = await prisma.apiKey.findFirst({ where: { key: token, isActive: true } });
        if (!record) {
            return res.status(403).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } });
        }
        req.apiKeyRecord = { id: record.id, rateLimitPerMin: record.rateLimitPerMin ?? env.RATE_LIMIT_PER_MIN, key: record.key };
        next();
    };
}
