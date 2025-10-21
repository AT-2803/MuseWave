import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';

const execFileAsync = promisify(execFile);

export interface MediaInfo {
  duration: number;
  sampleRate: number;
  channels: number;
  format: string;
}

export async function probeMedia(filePath: string): Promise<MediaInfo> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath
  ]);
  const data = JSON.parse(stdout);
  const audioStream = data.streams.find((s: any) => s.codec_type === 'audio');
  return {
    duration: parseFloat(data.format.duration),
    sampleRate: parseInt(audioStream.sample_rate),
    channels: parseInt(audioStream.channels),
    format: data.format.format_name
  };
}

export async function runFfmpeg(args: string[]): Promise<void> {
  await execFileAsync('ffmpeg', args);
}

export async function convertAudio(input: string, output: string, options: string[] = []): Promise<void> {
  await runFfmpeg(['-i', input, ...options, output]);
}

export async function mixAudio(inputs: string[], output: string, volumes: number[] = []): Promise<void> {
  const filter = inputs.map((_, i) => `[${i}:a]volume=${volumes[i] || 1}[a${i}]`).join(';') +
                 inputs.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${inputs.length}:normalize=0[aout]`;
  await runFfmpeg([
    ...inputs.flatMap(f => ['-i', f]),
    '-filter_complex', filter,
    '-map', '[aout]',
    output
  ]);
}

export async function renderVideo(audio: string, image: string, output: string): Promise<void> {
  await runFfmpeg([
    '-loop', '1',
    '-i', image,
    '-i', audio,
    '-c:v', 'libx264',
    '-tune', 'stillimage',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-pix_fmt', 'yuv420p',
    '-shortest',
    output
  ]);
}