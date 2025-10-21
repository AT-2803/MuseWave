import { FastifyPluginAsync } from 'fastify';

export const healthRoute: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
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