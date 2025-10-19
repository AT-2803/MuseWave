import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from './db';
import { logger } from './logger';
import { Queue } from './queue';
import { env } from './env';
import { apiAuth } from './auth';
import { rateLimiter } from './rateLimiter';
import { buildApiRouter } from './routes/api';
import { jobsRouter } from './routes/jobs';
import { assetsRouter } from './routes/assets';
import { healthRouter } from './routes/health';
import { registry, requestCounter } from './metrics';
import { registerPlanWorker } from './workers/planWorker';
import { registerAudioWorker } from './workers/audioWorker';

const queue = new Queue({ prisma, logger });
registerPlanWorker(queue);
registerAudioWorker(queue);
queue.start();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.on('finish', () => {
    const route = (req.route && req.route.path) || req.originalUrl.split('?')[0] || 'unknown';
    requestCounter.inc({ method: req.method, route, status: String(res.statusCode) });
  });
  next();
});

app.use('/health', healthRouter);
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

app.use(apiAuth(prisma));
app.use(rateLimiter(prisma));

app.use('/v1/jobs', jobsRouter);
app.use('/v1/assets', assetsRouter);
app.use('/', buildApiRouter(queue));

const port = env.PORT;
const server = app.listen(port, () => {
  logger.info({ port }, 'MuseWave backend listening');
});

process.on('SIGINT', async () => {
  logger.info('Shutting down (SIGINT)');
  queue.stop();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down (SIGTERM)');
  queue.stop();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});
