import fastify from 'fastify';
import { healthRoute } from './api/health.js';
import { seedRoute } from './api/model/seed.js';
import { planRoute } from './api/generate/plan.js';
import { audioRoute } from './api/generate/audio.js';
import { vocalsRoute } from './api/generate/vocals.js';
import { mixRoute } from './api/generate/mix.js';
import { videoRoute } from './api/generate/video.js';
import { pipelineRoute } from './api/generate/pipeline.js';
import { jobRoute } from './api/jobs/[id].js';
import { assetRoute } from './api/assets/[id].js';
import { metricsRoute } from './api/metrics.js';

const app = fastify({ logger: true });

app.register(healthRoute);
app.register(seedRoute, { prefix: '/api/model' });
app.register(planRoute, { prefix: '/api/generate' });
app.register(audioRoute, { prefix: '/api/generate' });
app.register(vocalsRoute, { prefix: '/api/generate' });
app.register(mixRoute, { prefix: '/api/generate' });
app.register(videoRoute, { prefix: '/api/generate' });
app.register(pipelineRoute, { prefix: '/api/generate' });
app.register(jobRoute, { prefix: '/api/jobs' });
app.register(assetRoute, { prefix: '/api/assets' });
app.register(metricsRoute);

export default app;