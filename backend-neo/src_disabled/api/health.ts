import { FastifyPluginAsync } from 'fastify';

export const healthRoute: FastifyPluginAsync = async (app) => {
  console.log('Registering health route');
  app.get('/health', async () => {
    console.log('Health endpoint called');
    // Check ffmpeg availability
    let ffmpegType = 'wasm';
    try {
      const { execSync } = await import('child_process');
      execSync('ffmpeg -version', { stdio: 'ignore' });
      ffmpegType = 'cli';
    } catch {}

    return { status: 'ok', ffmpeg: ffmpegType };
  });
};