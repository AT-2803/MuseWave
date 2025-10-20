import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../logger.js';
export class VideoService {
    async generateVideo(audioPath, plan, outputPath) {
        const tempDir = path.dirname(outputPath);
        await fs.mkdir(tempDir, { recursive: true });
        // Get duration from plan or default
        const duration = plan?.structure?.reduce((sum, s) => sum + s.duration, 0) || 30;
        // Generate simple visuals - color gradients that change with the music
        const visualPath = path.join(tempDir, 'visuals.mp4');
        await this.generateVisuals(plan, duration, visualPath);
        // Combine audio and video
        await this.combineAudioVideo(audioPath, visualPath, outputPath);
        // Clean up
        try {
            await fs.unlink(visualPath);
        }
        catch (error) {
            logger.warn({ error }, 'Failed to clean up visuals');
        }
    }
    generateVisuals(plan, duration, outputPath) {
        return new Promise((resolve, reject) => {
            // Generate color gradients that change over time
            const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
            const filter = colors.map((color, i) => {
                const start = (i / colors.length) * duration;
                const end = ((i + 1) / colors.length) * duration;
                return `color=c=${color}:s=1920x1080:d=${end - start}[c${i}]`;
            }).join(';') + ';' +
                colors.map((_, i) => `[c${i}]`).join('') +
                `concat=n=${colors.length}:v=1:a=0[vout]`;
            const ffmpeg = spawn('ffmpeg', [
                '-f', 'lavfi',
                '-i', `color=c=black:s=1920x1080:d=${duration}`,
                '-filter_complex', filter,
                '-map', '[vout]',
                '-c:v', 'libx264',
                '-t', duration.toString(),
                '-y',
                outputPath
            ]);
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`ffmpeg visuals exited with code ${code}`));
                }
            });
            ffmpeg.on('error', reject);
        });
    }
    combineAudioVideo(audioPath, videoPath, outputPath) {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-i', videoPath,
                '-i', audioPath,
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-b:a', '192k',
                '-shortest',
                '-y',
                outputPath
            ]);
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`ffmpeg combine exited with code ${code}`));
                }
            });
            ffmpeg.on('error', reject);
        });
    }
}
export const videoService = new VideoService();
