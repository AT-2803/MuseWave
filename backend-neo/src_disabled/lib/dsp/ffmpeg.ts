import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export async function runFfmpeg(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();
    // Configure command
    command.on('end', () => resolve('done')).on('error', reject);
    // Add inputs/outputs based on args
  });
}

export async function probeFile(file: string) {
  return new Promise((resolve: (value: any) => void, reject: (reason: Error) => void) => {
    ffmpeg.ffprobe(file, (err: Error | null, data: any) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}