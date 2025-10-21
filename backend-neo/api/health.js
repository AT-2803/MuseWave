export default async function handler(request, response) {
  // Check ffmpeg availability
  let ffmpegType = 'wasm';
  try {
    const { execSync } = await import('child_process');
    execSync('ffmpeg -version', { stdio: 'ignore' });
    ffmpegType = 'cli';
  } catch {}

  response.status(200).json({ status: 'ok', ffmpeg: ffmpegType });
}