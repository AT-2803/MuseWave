import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runStructuredPrompt, SUGGESTION_SYSTEM_INSTRUCTION } from './_gemini';

const LYRICS_SCHEMA = {
  type: 'object',
  properties: {
    lyrics: { type: 'string' },
  },
  required: ['lyrics'],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const context = req.body?.context;
    if (!context || typeof context !== 'object') {
      res.status(400).json({ error: 'Missing context payload' });
      return;
    }

    const userPrompt = `
CONTEXT:
- Current Prompt: "${context.prompt || '(empty)'}"
- Selected Genres: ${(context.genres || []).join(', ') || 'None'}
- Artist Influences: ${(context.artists || []).join(', ') || 'None'}
- Current Lyrics: "${context.lyrics || 'None'}"
- Desired Duration (seconds): ${context.duration ?? 0}

TASK:
Expand or rewrite the "Current Lyrics" into a more complete lyrical theme suitable for a song of the specified duration. The theme should match the mood of the other context fields. Structure it with clear sections if possible (e.g., Verse 1, Chorus). Return a JSON object with a single key "lyrics".`;

    const result = await runStructuredPrompt(
      SUGGESTION_SYSTEM_INSTRUCTION,
      userPrompt,
      LYRICS_SCHEMA,
      0.85
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('[api/enhance-lyrics] Failure', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
