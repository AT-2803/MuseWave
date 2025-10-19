import { PrismaClient } from '@prisma/client';
import { NextFunction, Response } from 'express';
import { AuthedRequest } from './auth';
import { logger } from './logger';
import { rateLimitCounter } from './metrics';

const BUCKET_INTERVAL_MS = 60_000;
const SNAPSHOT_INTERVAL_MS = 5_000;

type CounterKey = string;

type CounterValue = {
  apiKeyId: string;
  windowStart: number;
  count: number;
};

const memoryCounters = new Map<CounterKey, CounterValue>();
let snapshotTimer: NodeJS.Timeout | null = null;

function getWindowStart(ts: number) {
  return ts - (ts % BUCKET_INTERVAL_MS);
}

function counterKey(apiKeyId: string, windowStart: number) {
  return `${apiKeyId}:${windowStart}`;
}

async function snapshotToDb(prisma: PrismaClient) {
  const entries = Array.from(memoryCounters.values());
  if (!entries.length) return;

  for (const entry of entries) {
    try {
      await prisma.rateCounter.upsert({
        where: {
          apiKeyId_windowStart: {
            apiKeyId: entry.apiKeyId,
            windowStart: new Date(entry.windowStart),
          },
        },
        update: { count: entry.count },
        create: {
          apiKeyId: entry.apiKeyId,
          windowStart: new Date(entry.windowStart),
          count: entry.count,
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to snapshot rate counter');
    }
  }
}

export function initRateLimiter(prisma: PrismaClient) {
  if (snapshotTimer) return;
  snapshotTimer = setInterval(() => {
    snapshotToDb(prisma).catch((error) => logger.error({ err: error }, 'Rate limiter snapshot failed'));
  }, SNAPSHOT_INTERVAL_MS);
}

export function rateLimiter(prisma: PrismaClient) {
  initRateLimiter(prisma);

  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const apiKey = req.apiKeyRecord;
    if (!apiKey) {
      return res.status(500).json({ error: { code: 'AUTH_CONTEXT_MISSING', message: 'Auth info missing' } });
    }

    const now = Date.now();
    const windowStart = getWindowStart(now);
    const key = counterKey(apiKey.id, windowStart);
    const rateLimit = apiKey.rateLimitPerMin;

    const counter = memoryCounters.get(key) ?? { apiKeyId: apiKey.id, windowStart, count: 0 };
    if (counter.count >= rateLimit) {
      const retryAfter = Math.ceil((windowStart + BUCKET_INTERVAL_MS - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      rateLimitCounter.inc();
      return res.status(429).json({ error: { code: 'RATE_LIMIT', message: 'Rate limit exceeded' } });
    }

    counter.count += 1;
    memoryCounters.set(key, counter);

    next();
  };
}
