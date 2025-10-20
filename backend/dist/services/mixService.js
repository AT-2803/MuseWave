import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../logger.js';
export class MixService {
    async mixTracks(inputs, outputPath) {
        const tempDir = path.dirname(outputPath);
        await fs.mkdir(tempDir, { recursive: true });
        const inputFiles = Object.entries(inputs).filter(([_, path]) => path);
        if (inputFiles.length === 0) {
            throw new Error('No input tracks provided');
        }
        if (inputFiles.length === 1) {
            // Just copy the single track
            await fs.copyFile(inputFiles[0][1], outputPath);
            return;
        }
        // Build ffmpeg command for mixing
        const args = [];
        // Add inputs
        for (const [label, filePath] of inputFiles) {
            args.push('-i', filePath);
        }
        // Mix command
        const mixFilter = inputFiles.map((_, i) => `[${i}:a]`).join('') +
            `amix=inputs=${inputFiles.length}:duration=longest[aout]`;
        args.push('-filter_complex', mixFilter, '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k', '-y', outputPath);
        await this.runFfmpeg(args);
    }
    runFfmpeg(args) {
        return new Promise((resolve, reject) => {
            logger.info({ args }, 'Running ffmpeg mix');
            const ffmpeg = spawn('ffmpeg', args);
            let stderr = '';
            ffmpeg.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    logger.error({ code, stderr }, 'ffmpeg mix failed');
                    reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
                }
            });
            ffmpeg.on('error', (error) => {
                logger.error({ error }, 'ffmpeg mix error');
                reject(error);
            });
        });
    }
}
export const mixService = new MixService();
