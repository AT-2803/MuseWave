export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { musicPrompt, genres, durationSec, artistInspiration } = request.body || {};

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const path = await import('path');

  const execAsync = promisify(exec);
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  try {
    // Step 1: Generate plan
    const planPrompt = `Generate a detailed music plan for a song with the following details:
- Prompt: ${musicPrompt}
- Genres: ${genres.join(', ')}
- Duration: ${durationSec} seconds
- Artist Inspiration: ${artistInspiration}

Provide a JSON object with: title, genre, bpm, key, sections (array), duration_sec.`;

    const planResult = await model.generateContent(planPrompt);
    const planResponse = await planResult.response;
    const planText = planResponse.text();
    const plan = JSON.parse(planText);

    // Step 2: Generate audio
    const audioPath = path.join(process.cwd(), 'assets', `audio-${Date.now()}.wav`);
    const audioCommand = `ffmpeg -f lavfi -i "sine=frequency=440:duration=${durationSec}" -acodec pcm_s16le -ar 44100 ${audioPath}`;
    await execAsync(audioCommand);

    // Step 3: Generate vocals
    const vocalsPath = path.join(process.cwd(), 'assets', `vocals-${Date.now()}.wav`);
    const vocalsCommand = `ffmpeg -f lavfi -i "sine=frequency=660:duration=${Math.min(durationSec, 10)}" -acodec pcm_s16le -ar 44100 ${vocalsPath}`;
    await execAsync(vocalsCommand);

    // Step 4: Mix
    const mixPath = path.join(process.cwd(), 'assets', `mix-${Date.now()}.wav`);
    const mixCommand = `ffmpeg -i ${audioPath} -i ${vocalsPath} -filter_complex "[0:a][1:a]amix=inputs=2:duration=first[aout]" -map "[aout]" ${mixPath}`;
    await execAsync(mixCommand);

    // Step 5: Generate video
    const imagePath = path.join(process.cwd(), 'public', 'default-image.jpg');
    const videoPath = path.join(process.cwd(), 'assets', `video-${Date.now()}.mp4`);
    const videoCommand = `ffmpeg -loop 1 -i ${imagePath} -i ${mixPath} -c:v libx264 -c:a aac -shortest ${videoPath}`;
    await execAsync(videoCommand);

    const videoUrl = `/assets/video-${Date.now()}.mp4`;

    response.status(200).json({ jobId: 'pipeline-job-123', status: 'completed', plan, videoUrl });
  } catch (error) {
    console.error('Error in pipeline:', error);
    response.status(500).json({ error: 'Failed to complete pipeline' });
  }
}