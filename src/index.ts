import 'dotenv/config';
import { config } from './config';
import { buildServer } from './server';
import { logger } from './logger';
import { ensureFfmpeg } from './plugins/ffmpeg';
import { queue } from './queue/queue';
import { registerWorkers } from './queue/workers';

async function main() {
  const ffmpegOk = await ensureFfmpeg();
  if (!ffmpegOk) {
    logger.warn('ffmpeg/ffprobe missing - generation will fail');
  }

  const server = await buildServer();
  registerWorkers(queue);
  await queue.start();

  const address = await server.listen({ port: config.port, host: '0.0.0.0' });
  logger.info({ address }, 'Server listening');
}

main().catch((error) => {
  logger.error({ error }, 'Fatal startup error');
  process.exit(1);
});
