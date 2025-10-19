import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { MusicPlan } from './planService.js';

export class AudioService {
  async generateAudio(plan: MusicPlan, duration: number, outputPath: string): Promise<void> {
    // Generate basic audio using ffmpeg
    // This is a simplified implementation - in reality, you'd use more sophisticated synthesis

    const tempDir = path.dirname(outputPath);
    await fs.mkdir(tempDir, { recursive: true });

    // Generate sine wave for each section
    const audioParts: string[] = [];

    for (let i = 0; i < plan.structure.length; i++) {
      const section = plan.structure[i];
      const freq = this.getFrequencyForSection(section.section, plan.bpm);
      const partPath = path.join(tempDir, `part_${i}.wav`);

      await this.generateTone(freq, section.duration, partPath);
      audioParts.push(partPath);
    }

    // Concatenate parts
    if (audioParts.length === 1) {
      await fs.copyFile(audioParts[0], outputPath);
    } else {
      await this.concatenateAudio(audioParts, outputPath);
    }

    // Clean up temp files
    for (const part of audioParts) {
      try {
        await fs.unlink(part);
      } catch (error) {
        logger.warn({ error }, `Failed to clean up ${part}`);
      }
    }
  }

  private getFrequencyForSection(section: string, bpm: number): number {
    // Map sections to frequencies (simplified)
    const baseFreq = 440; // A4
    switch (section.toLowerCase()) {
      case 'intro': return baseFreq * 0.5;
      case 'verse': return baseFreq * 0.75;
      case 'chorus': return baseFreq;
      case 'bridge': return baseFreq * 1.25;
      case 'outro': return baseFreq * 0.25;
      default: return baseFreq;
    }
  }

  private generateTone(frequency: number, duration: number, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', `sine=frequency=${frequency}:duration=${duration}`,
        '-c:a', 'pcm_s16le',
        '-ar', '44100',
        '-ac', '2',
        '-y',
        outputPath
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on('error', reject);
    });
  }

  private concatenateAudio(inputs: string[], output: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-i', `concat:${inputs.join('|')}`,
        '-c', 'copy',
        '-y',
        output
      ];

      const ffmpeg = spawn('ffmpeg', args);

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg concat exited with code ${code}`));
        }
      });

      ffmpeg.on('error', reject);
    });
  }
}

export const audioService = new AudioService();