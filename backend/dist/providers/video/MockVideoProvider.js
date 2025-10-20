import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
export class MockVideoProvider {
    async generateVideo(audioBuffer, plan, duration) {
        const tempDir = tmpdir();
        const audioPath = path.join(tempDir, `temp_audio_${Date.now()}.wav`);
        const videoPath = path.join(tempDir, `temp_video_${Date.now()}.mp4`);
        const outputPath = path.join(tempDir, `output_${Date.now()}.mp4`);
        try {
            // Write audio buffer to temp file
            await fs.writeFile(audioPath, audioBuffer);
            // Generate video visuals
            await this.generateVisuals(plan, duration, videoPath);
            // Combine audio and video
            await this.combineAudioVideo(audioPath, videoPath, outputPath);
            // Read result
            const result = await fs.readFile(outputPath);
            return result;
        }
        finally {
            // Clean up temp files
            const files = [audioPath, videoPath, outputPath];
            for (const file of files) {
                try {
                    await fs.unlink(file);
                }
                catch (error) {
                    // Ignore cleanup errors
                }
            }
        }
    }
    generateVisuals(plan, duration, outputPath) {
        return new Promise((resolve, reject) => {
            // Generate animated color gradients based on plan
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
            const segments = Math.min(colors.length, plan.structure?.length || 1);
            let filter = '';
            let timeOffset = 0;
            for (let i = 0; i < segments; i++) {
                const segmentDuration = duration / segments;
                const color = colors[i];
                filter += `color=c=${color}:s=1920x1080:d=${segmentDuration}[v${i}];`;
                timeOffset += segmentDuration;
            }
            // Concatenate segments
            const concatInputs = colors.map((_, i) => `[v${i}]`).join('');
            filter += `${concatInputs}concat=n=${segments}:v=1:a=0[vout]`;
            const ffmpeg = spawn('ffmpeg', [
                '-f', 'lavfi',
                '-i', `color=c=black:s=1920x1080:d=${duration}`,
                '-filter_complex', filter,
                '-map', '[vout]',
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-t', duration.toString(),
                '-y',
                outputPath
            ]);
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`ffmpeg video generation exited with code ${code}`));
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
