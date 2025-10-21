import 'dotenv/config';

// Vercel serverless function for health check
export default async function handler(req, res) {
  // Check ffmpeg availability
  let ffmpegType = 'wasm';
  try {
    const { execSync } = await import('child_process');
    execSync('ffmpeg -version', { stdio: 'ignore' });
    ffmpegType = 'cli';
  } catch {}

  res.status(200).json({ status: 'ok', ffmpeg: ffmpegType });
}