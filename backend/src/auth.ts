import { PrismaClient } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { env } from './env';

export interface AuthedRequest extends Request {
  apiKeyRecord?: { id: string; rateLimitPerMin: number; key: string };
}

export function apiAuth(prisma: PrismaClient) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
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
