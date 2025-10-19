import 'dotenv/config';
import { createServer } from './server.js';
import { config } from './config.js';
import { logger } from './logger.js';

const start = async () => {
  try {
    const app = await createServer();
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    logger.info(`Server listening on port ${config.PORT}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});
