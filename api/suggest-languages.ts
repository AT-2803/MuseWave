import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runStructuredPrompt, SUGGESTION_SYSTEM_INSTRUCTION } from './_gemini';

const LANGUAGE_SCHEMA = {
  type: 'object',
  properties: {
    languages: { type: 'array', items: { type: 'string' } },
  },
  required: ['languages'],
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
- Artist Inspirations: ${(context.artists || []).join(', ') || 'None'}
- Existing Languages: ${(context.languages || []).join(', ') || 'None'}
- Lyrics Provided: ${context.lyrics ? 'Yes' : 'No'}

TASK:
Recommend 1-3 vocal languages that best suit the genre, cultural tone, and artist inspirations. Include English if crossover appeal is likely. Return a JSON object with key "languages" containing an array of strings.`;

    const result = await runStructuredPrompt(
      SUGGESTION_SYSTEM_INSTRUCTION,
      userPrompt,
      LANGUAGE_SCHEMA,
      0.7
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('[api/suggest-languages] Failure', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
