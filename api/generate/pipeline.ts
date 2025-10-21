import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { musicPrompt, genres, duration, artistInspiration, lyrics, generateVideo, videoStyles } = req.body as any;

    if (!musicPrompt || typeof musicPrompt !== 'string' || musicPrompt.length < 1) {
      return res.status(400).json({ error: 'Invalid music prompt' });
    }

    if (!duration || typeof duration !== 'number' || duration < 30 || duration > 600) {
      return res.status(400).json({ error: 'Invalid duration (must be 30-600 seconds)' });
    }

    // Forward request to backend-neo which has the real implementation
    const backendUrl = process.env.BACKEND_NEO_URL || 'http://localhost:3001';
    
    const response = await fetch(`${backendUrl}/api/generate/pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        musicPrompt,
        genres: genres || [],
        duration,
        artistInspiration,
        lyrics,
        generateVideo,
        videoStyles,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Backend request failed' }));
      return res.status(response.status).json(error);
    }

    const data = await response.json();
    
    res.status(202).json({
      jobId: data.jobId,
      message: data.message || 'Generation started',
      status: 'processing'
    });
    
  } catch (error) {
    console.error('Pipeline error:', error);
    res.status(500).json({ 
      error: 'Generation failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
