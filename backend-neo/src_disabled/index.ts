// import 'dotenv/config';
import fastify from 'fastify';
import { healthRoute } from './api/health.ts';
// import { seedRoute } from './api/model/seed.ts';
// import { planRoute } from './api/generate/plan.ts';
// import { audioRoute } from './api/generate/audio.ts';
// import { vocalsRoute } from './api/generate/vocals.ts';
// import { mixRoute } from './api/generate/mix.ts';
// import { videoRoute } from './api/generate/video.ts';
// import { pipelineRoute } from './api/generate/pipeline.ts';
// import { jobRoute } from './api/jobs/[id].ts';
// import { assetRoute } from './api/assets/[id].ts';
// import { metricsRoute } from './api/metrics.ts';

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const app = fastify({ logger: false });

await app.register(healthRoute);
// await app.register(seedRoute, { prefix: '/api/model' });
// await app.register(planRoute, { prefix: '/api/generate' });
// await app.register(audioRoute, { prefix: '/api/generate' });
// await app.register(vocalsRoute, { prefix: '/api/generate' });
// await app.register(mixRoute, { prefix: '/api/generate' });
// await app.register(videoRoute, { prefix: '/api/generate' });
// await app.register(pipelineRoute, { prefix: '/api/generate' });
// await app.register(jobRoute, { prefix: '/api/jobs' });
// await app.register(assetRoute, { prefix: '/api/assets' });
// await app.register(metricsRoute);

const port = 3002; // hardcode for now
await app.listen({ port: Number(port), host: '0.0.0.0' });
console.log(`Server listening at http://127.0.0.1:${port}`);

export default app;