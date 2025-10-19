import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runStructuredPrompt, SUGGESTION_SYSTEM_INSTRUCTION } from './_gemini';

const ARTIST_SCHEMA = {
  type: 'object',
  properties: {
    artists: { type: 'array', items: { type: 'string' } },
  },
  required: ['artists'],
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
- Lyrical Theme: "${context.lyrics || 'None'}"

TASK:
Based on the context and your expert knowledge, suggest 3-5 relevant artist influences. Provide a mix of foundational artists and **currently trending, modern artists** (e.g., Fred again.., Anyma, Bicep). The suggestions must be insightful and directly related to the user's input. Return a JSON object with a single key "artists" which is an array of strings.`;

    const result = await runStructuredPrompt(
      SUGGESTION_SYSTEM_INSTRUCTION,
      userPrompt,
      ARTIST_SCHEMA,
      0.85
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('[api/suggest-artists] Failure', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
