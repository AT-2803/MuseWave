import { Router } from 'express';
import { execFile } from 'child_process';
import { ffmpegGauge } from '../metrics';

function checkFfmpeg(): Promise<'found' | 'missing'> {
  return new Promise((resolve) => {
    execFile('ffmpeg', ['-version'], (error) => {
      if (error) {
        ffmpegGauge.set(0);
        resolve('missing');
      } else {
        ffmpegGauge.set(1);
        resolve('found');
      }
    });
  });
}

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const ffmpeg = await checkFfmpeg();
  res.json({ status: 'ok', ffmpeg });
});
