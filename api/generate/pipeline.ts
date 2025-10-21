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

    // Generate a realistic job ID
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Build a mock plan that matches frontend expectations
    const genresList = Array.isArray(genres) && genres.length > 0 ? genres : ['electronic'];
    const bpm = genresList.includes('drum & bass') ? 174 
              : genresList.includes('techno') ? 128
              : genresList.includes('lofi hip hop') ? 80
              : 120;

    const mockPlan = {
      title: musicPrompt.split(' ').slice(0, 4).join(' ') + '...',
      genre: genresList[0],
      duration_sec: duration,
      bpm,
      key: 'C Minor',
      sections: ['Intro', 'Verse', 'Chorus', 'Breakdown', 'Outro'],
      bars_per_section: 8,
      chord_progressions: {
        'Intro': ['Cm7', 'Abmaj7', 'Eb', 'Bb'],
        'Verse': ['Cm7', 'Abmaj7', 'Eb', 'Bb'],
        'Chorus': ['Fm7', 'Cm7', 'Abmaj7', 'Bb'],
        'Breakdown': ['Abmaj7', 'Bb'],
        'Outro': ['Cm7', 'Abmaj7']
      },
      lyrics_lines: lyrics ? [
        { section: 'Verse', text: lyrics.split('\n')[0] || 'Verse lyrics...' },
        { section: 'Chorus', text: lyrics.split('\n')[1] || 'Chorus lyrics...' }
      ] : [],
      artist_style_notes: artistInspiration || ['Atmospheric', 'Melodic'],
      instrumentation: ['Synth Pads', 'Bass', 'Drums', 'Lead'],
      arrangement_notes: ['Build tension in breakdown', 'Drop at chorus'],
      energy_curve: [
        { section: 'Intro', level: 0.3 },
        { section: 'Verse', level: 0.5 },
        { section: 'Chorus', level: 0.9 },
        { section: 'Breakdown', level: 0.4 },
        { section: 'Outro', level: 0.2 }
      ]
    };

    res.status(200).json({
      jobId,
      plan: mockPlan,
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
