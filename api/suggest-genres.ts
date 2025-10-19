import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runStructuredPrompt, SUGGESTION_SYSTEM_INSTRUCTION } from './_gemini';

const GENRE_SCHEMA = {
  type: 'object',
  properties: {
    genres: { type: 'array', items: { type: 'string' } },
  },
  required: ['genres'],
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
- Artist Influences: ${(context.artists || []).join(', ') || 'None'}
- Lyrical Theme: "${context.lyrics || 'None'}"

TASK:
Based on the provided context and your vast knowledge of music history and current trends, suggest 3-5 relevant genres. Return a JSON object with a single key "genres" which is an array of strings.`;

    const result = await runStructuredPrompt(
      SUGGESTION_SYSTEM_INSTRUCTION,
      userPrompt,
      GENRE_SCHEMA,
      0.8
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('[api/suggest-genres] Failure', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
