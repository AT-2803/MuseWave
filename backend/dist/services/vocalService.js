import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../logger.js';
export class VocalService {
    async generateVocals(plan, duration, outputPath) {
        // Simplified vocal generation - in reality, this would use TTS or vocal synthesis
        // For now, generate some vocal-like tones
        const tempDir = path.dirname(outputPath);
        await fs.mkdir(tempDir, { recursive: true });
        // Generate a simple vocal melody
        const melody = this.generateMelody(duration);
        await this.synthesizeMelody(melody, outputPath);
    }
    generateMelody(duration) {
        // Simple melody generation
        const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88]; // C major scale
        const melody = [];
        let time = 0;
        while (time < duration) {
            const noteDuration = Math.random() * 2 + 0.5; // 0.5-2.5 seconds
            const freq = notes[Math.floor(Math.random() * notes.length)];
            melody.push({ freq, duration: Math.min(noteDuration, duration - time) });
            time += noteDuration;
        }
        return melody;
    }
    synthesizeMelody(melody, outputPath) {
        return new Promise(async (resolve, reject) => {
            const tempDir = path.dirname(outputPath);
            const partFiles = [];
            // Generate each note
            for (let i = 0; i < melody.length; i++) {
                const partPath = path.join(tempDir, `vocal_${i}.wav`);
                partFiles.push(partPath);
                await this.generateTone(melody[i].freq, melody[i].duration, partPath);
            }
            // Concatenate
            if (partFiles.length === 1) {
                await fs.copyFile(partFiles[0], outputPath);
            }
            else {
                await this.concatenateAudio(partFiles, outputPath);
            }
            // Clean up
            for (const part of partFiles) {
                try {
                    await fs.unlink(part);
                }
                catch (error) {
                    logger.warn({ error }, `Failed to clean up ${part}`);
                }
            }
            resolve();
        });
    }
    generateTone(frequency, duration, outputPath) {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-f', 'lavfi',
                '-i', `sine=frequency=${frequency}:duration=${duration}`,
                '-c:a', 'pcm_s16le',
                '-ar', '44100',
                '-ac', '1', // Mono for vocals
                '-y',
                outputPath
            ]);
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`ffmpeg exited with code ${code}`));
                }
            });
            ffmpeg.on('error', reject);
        });
    }
    concatenateAudio(inputs, output) {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-i', `concat:${inputs.join('|')}`,
                '-c', 'copy',
                '-y',
                output
            ]);
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`ffmpeg concat exited with code ${code}`));
                }
            });
            ffmpeg.on('error', reject);
        });
    }
}
export const vocalService = new VocalService();
