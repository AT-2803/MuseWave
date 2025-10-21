import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

ffmpeg.setFfmpegPath(ffmpegStatic);

export async function runFfmpeg(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();
    // Configure command
    command.on('end', resolve).on('error', reject);
    // Add inputs/outputs based on args
  });
}

export async function probeFile(file: string) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}