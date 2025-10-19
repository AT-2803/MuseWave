import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { AudioProvider } from './AudioProvider.js';

export class MockAudioProvider implements AudioProvider {
  async generateAudio(plan: any, duration: number): Promise<Buffer> {
    const tempDir = tmpdir();
    const outputPath = path.join(tempDir, `audio_${Date.now()}.wav`);

    try {
      // Generate basic audio using ffmpeg DSP
      await this.generateWithFfmpeg(plan, duration, outputPath);

      // Read the generated file
      const buffer = await fs.readFile(outputPath);
      return buffer;
    } finally {
      // Clean up
      try {
        await fs.unlink(outputPath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  private generateWithFfmpeg(plan: any, duration: number, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Build a complex ffmpeg filter for DSP synthesis
      const bpm = plan.bpm || 128;
      const key = plan.key || 'C Major';

      // Generate multiple oscillators for rich sound
      const oscillators = this.buildOscillators(plan, duration);

      // Build filter complex
      const filterParts = oscillators.map((osc, i) =>
        `sine=frequency=${osc.freq}:duration=${osc.duration}[a${i}]`
      );

      const mixInputs = oscillators.map((_, i) => `[a${i}]`).join('');
      const mixFilter = `${mixInputs}amix=inputs=${oscillators.length}:duration=longest,highpass=f=80,lowpass=f=8000[aout]`;

      const args = [
        '-f', 'lavfi',
        '-i', filterParts[0].split('[a0]')[0], // First input
      ];

      // Add additional inputs
      for (let i = 1; i < filterParts.length; i++) {
        args.push('-f', 'lavfi', '-i', filterParts[i].split(`[a${i}]`)[0]);
      }

      args.push(
        '-filter_complex', mixFilter,
        '-map', '[aout]',
        '-c:a', 'pcm_s16le',
        '-ar', '44100',
        '-ac', '2',
        '-t', duration.toString(),
        '-y',
        outputPath
      );

      const ffmpeg = spawn('ffmpeg', args);

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

  private buildOscillators(plan: any, duration: number): Array<{ freq: number; duration: number }> {
    const oscillators = [];
    const sections = plan.structure || [{ duration }];

    let time = 0;
    for (const section of sections) {
      const sectionDuration = section.duration;
      const baseFreq = this.getBaseFrequency(plan.key);

      // Generate harmony for this section
      const harmony = this.generateHarmony(baseFreq, section.section);

      for (const freq of harmony) {
        oscillators.push({
          freq,
          duration: sectionDuration,
        });
      }

      time += sectionDuration;
      if (time >= duration) break;
    }

    return oscillators.slice(0, 10); // Limit to 10 oscillators for performance
  }

  private getBaseFrequency(key: string): number {
    const keyMap: Record<string, number> = {
      'C Major': 261.63,
      'C Minor': 261.63,
      'D Major': 293.66,
      'D Minor': 293.66,
      'E Major': 329.63,
      'F Major': 349.23,
      'G Major': 392.00,
      'A Major': 440.00,
      'B Major': 493.88,
    };

    return keyMap[key] || 261.63;
  }

  private generateHarmony(baseFreq: number, section: string): number[] {
    const harmonies: Record<string, number[]> = {
      'intro': [baseFreq * 0.5, baseFreq * 0.75],
      'verse': [baseFreq, baseFreq * 1.25, baseFreq * 1.5],
      'chorus': [baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2],
      'bridge': [baseFreq * 1.5, baseFreq * 2, baseFreq * 2.5],
      'outro': [baseFreq * 0.25, baseFreq * 0.5],
    };

    return harmonies[section.toLowerCase()] || [baseFreq];
  }
}