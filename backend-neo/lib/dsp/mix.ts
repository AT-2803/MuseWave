import { runFfmpeg } from './ffmpeg';

export interface MixConfig {
  inputs: string[];
  volumes: number[];
  eq: { low: number; mid: number; high: number };
  compression: { threshold: number; ratio: number; attack: number; release: number };
  reverb: number; // 0-1
}

export async function mixAndMaster(config: MixConfig, output: string): Promise<void> {
  const inputs = config.inputs.map((f, i) => `-i ${f}`).join(' ');
  const volumeFilters = config.inputs.map((_, i) => `[${i}:a]volume=${config.volumes[i] || 1}[a${i}]`).join(';');
  const eqFilter = `equalizer=f=100:width_type=o:width=2:g=${config.eq.low},equalizer=f=1000:width_type=o:width=2:g=${config.eq.mid},equalizer=f=5000:width_type=o:width=2:g=${config.eq.high}`;
  const compFilter = `compand=attacks=${config.compression.attack}:decays=${config.compression.release}:points=-70/-60|-30/-10|0/-5:soft-knee=6`;
  const reverbFilter = config.reverb > 0 ? `aecho=0.8:0.9:${config.reverb * 1000}:0.3` : '';
  const filter = `${volumeFilters}${config.inputs.map((_, i) => `[a${i}]`).join('')}amix=inputs=${config.inputs.length}:normalize=0[a];[a]${eqFilter},${compFilter}${reverbFilter ? ',' + reverbFilter : ''}[out]`;
  await runFfmpeg([
    ...config.inputs.flatMap(f => ['-i', f]),
    '-filter_complex', filter,
    '-map', '[out]',
    output
  ]);
}