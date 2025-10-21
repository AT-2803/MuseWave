import { runFfmpeg } from './ffmpeg';
import { degreeToHz } from '../music/theory';

export interface StemConfig {
  bpm: number;
  key: string;
  scale: string;
  duration: number; // seconds
}

export async function generateDrums(config: StemConfig, output: string): Promise<void> {
  // Simple kick/snare pattern using sine waves and noise
  const kickFreq = 60; // Hz
  const snareFreq = 200;
  const pattern = 'k...s...k.s.....'; // 16th notes
  const beatDur = 60 / config.bpm / 4; // 16th note duration
  const filter = pattern.split('').map((hit, i) => {
    if (hit === 'k') {
      return `sine=f=${kickFreq}:d=${beatDur}:a=0.8`;
    } else if (hit === 's') {
      return `anoisesrc=d=${beatDur}:a=0.6`;
    } else {
      return `sine=f=0:d=${beatDur}:a=0`;
    }
  }).join(',');
  await runFfmpeg([
    '-f', 'lavfi',
    '-i', `amovie='anullsrc=d=${config.duration}:a=0'`,
    '-filter_complex', `[0:a]${filter}concat=n=${pattern.length}:v=0:a=1[aout]`,
    '-map', '[aout]',
    output
  ]);
}

export async function generateBass(config: StemConfig, notes: number[], output: string): Promise<void> {
  const noteDur = 60 / config.bpm; // quarter notes
  const filter = notes.map(note => `sine=f=${degreeToHz(note, config.key, config.scale as 'major' | 'minor')}:d=${noteDur}:a=0.5`).join(',');
  await runFfmpeg([
    '-f', 'lavfi',
    '-i', `amovie='anullsrc=d=${config.duration}:a=0'`,
    '-filter_complex', `[0:a]${filter}concat=n=${notes.length}:v=0:a=1[aout]`,
    '-map', '[aout]',
    output
  ]);
}

export async function generateLead(config: StemConfig, notes: number[], output: string): Promise<void> {
  const noteDur = 60 / config.bpm / 2; // eighth notes
  const filter = notes.map(note => `sine=f=${degreeToHz(note, config.key, config.scale as 'major' | 'minor')}:d=${noteDur}:a=0.3`).join(',');
  await runFfmpeg([
    '-f', 'lavfi',
    '-i', `amovie='anullsrc=d=${config.duration}:a=0'`,
    '-filter_complex', `[0:a]${filter}concat=n=${notes.length}:v=0:a=1[aout]`,
    '-map', '[aout]',
    output
  ]);
}