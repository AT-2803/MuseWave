import { spawn } from 'child_process';
import { ffmpegGauge } from '../metrics.js';
export const ffmpegPlugin = async (app) => {
    // Check if ffmpeg is available
    const checkFfmpeg = async () => {
        return new Promise((resolve) => {
            const proc = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
            proc.on('close', (code) => {
                resolve(code === 0);
            });
            proc.on('error', () => {
                resolve(false);
            });
        });
    };
    const available = await checkFfmpeg();
    ffmpegGauge.set(available ? 1 : 0);
    if (!available) {
        app.log.warn('ffmpeg not found, audio/video processing will fail');
    }
    // Decorate with ffmpeg utilities
    app.decorate('ffmpeg', {
        available,
        spawn: (args, options) => spawn('ffmpeg', args, options),
    });
};
