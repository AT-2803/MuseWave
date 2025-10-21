import { runFfmpeg } from './ffmpeg';

export interface VideoConfig {
  audio: string;
  image: string;
  duration?: number; // override audio duration
  resolution: { width: number; height: number };
  fps: number;
  effects: string[]; // additional filters
}

export async function renderVideo(config: VideoConfig, output: string): Promise<void> {
  const filters = config.effects.join(',');
  await runFfmpeg([
    '-loop', '1',
    '-i', config.image,
    '-i', config.audio,
    '-c:v', 'libx264',
    '-tune', 'stillimage',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-pix_fmt', 'yuv420p',
    '-r', config.fps.toString(),
    '-s', `${config.resolution.width}x${config.resolution.height}`,
    ...(config.duration ? ['-t', config.duration.toString()] : []),
    ...(filters ? ['-filter_complex', filters] : []),
    '-shortest',
    output
  ]);
}