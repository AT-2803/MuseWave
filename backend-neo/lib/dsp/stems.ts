import { runFfmpeg } from './ffmpeg';
import { degreeToHz } from '../music/theory';

export interface StemConfig {
  bpm: number;
  key: string;
  scale: string;
  duration: number; // seconds
  swing?: number;
  energy?: number;
  kickPattern?: string;
  snarePattern?: string;
  hatsPattern?: string;
}

const DRUM_PATTERNS = {
  '4onthefloor': 'k...k...k...k...',
  '2&4-drive': 'k..sk..sk..sk..s',
  'dnb-syncop': 'k.k...s.k.k...s.',
  'ukg-syncop': 'k..s..k...s.....',
  'boom-bap': 'k.....s.k...s...',
  '808-grid': 'k...k...k.k.k...'
};

const SNARE_PATTERNS = {
  '2+4': '....s.......s...',
  '2+4-soft': '....s.......s...',
  '2+4-bright': '....S.......S...',
  '3': '........s.......',
  '2+4-clap': '....c.......c...'
};

const HATS_PATTERNS = {
  '8th': 'h.h.h.h.h.h.h.h.',
  '16th': 'hhhhhhhhhhhhhhhh',
  'offbeat-open': '.H.H.H.H.H.H.H.H',
  '16th-shuffle': 'h.hh.hh.hh.hh.h',
  'shuffled-16th': 'h.hh.hh.hh.hh.h',
  'triplet-ghosts': 'h..h..h..h..h..h',
  'triplets-rolls': 'hhhhhhhhhhhhhhhh'
};

export async function generateDrums(config: StemConfig, output: string): Promise<void> {
  const kickPattern = DRUM_PATTERNS[config.kickPattern || '4onthefloor'] || 'k...k...k...k...';
  const snarePattern = SNARE_PATTERNS[config.snarePattern || '2+4'] || '....s.......s...';
  const hatsPattern = HATS_PATTERNS[config.hatsPattern || '8th'] || 'h.h.h.h.h.h.h.h.';
  
  const beatDur = 60 / config.bpm / 4; // 16th note duration
  const energy = config.energy || 0.7;
  const swing = config.swing || 0.0;
  
  // Build combined pattern
  const patternLength = Math.max(kickPattern.length, snarePattern.length, hatsPattern.length);
  const totalBeats = Math.ceil(config.duration / (beatDur * patternLength));
  
  const filters: string[] = [];
  
  // Kick drum (sine wave with envelope)
  for (let beat = 0; beat < totalBeats; beat++) {
    for (let i = 0; i < patternLength; i++) {
      if (kickPattern[i] === 'k') {
        const time = beat * patternLength * beatDur + i * beatDur;
        const swingOffset = (i % 2 === 1) ? swing * beatDur : 0;
        filters.push(`sine=f=60:d=${beatDur * 0.3}:a=${0.9 * energy}:beep_factor=4`);
      }
    }
  }
  
  // Snare (noise burst)
  for (let beat = 0; beat < totalBeats; beat++) {
    for (let i = 0; i < patternLength; i++) {
      if (snarePattern[i] === 's' || snarePattern[i] === 'S' || snarePattern[i] === 'c') {
        const time = beat * patternLength * beatDur + i * beatDur;
        const amp = snarePattern[i] === 'S' ? 0.7 : 0.6;
        filters.push(`anoisesrc=d=${beatDur * 0.2}:a=${amp * energy}`);
      }
    }
  }
  
  // Hi-hats (short sine + noise)
  for (let beat = 0; beat < totalBeats; beat++) {
    for (let i = 0; i < patternLength; i++) {
      if (hatsPattern[i] === 'h' || hatsPattern[i] === 'H') {
        const time = beat * patternLength * beatDur + i * beatDur;
        const amp = hatsPattern[i] === 'H' ? 0.5 : 0.3;
        filters.push(`sine=f=8000:d=${beatDur * 0.1}:a=${amp * energy}`);
      }
    }
  }
  
  // Pad with silence if needed
  if (filters.length === 0) {
    filters.push(`sine=f=0:d=${config.duration}:a=0`);
  }
  
  const filterChain = filters.join(',');
  
  await runFfmpeg([
    '-f', 'lavfi',
    '-i', `anullsrc=d=${config.duration}`,
    '-filter_complex', `${filterChain}concat=n=${filters.length}:v=0:a=1[aout]`,
    '-map', '[aout]',
    '-y',
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