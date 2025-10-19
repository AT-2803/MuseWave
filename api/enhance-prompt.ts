import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runStructuredPrompt, SUGGESTION_SYSTEM_INSTRUCTION } from './_gemini';

const PROMPT_SCHEMA = {
  type: 'object',
  properties: {
    prompt: { type: 'string' },
  },
  required: ['prompt'],
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
- Lyrical Theme: "${context.lyrics || 'None'}"

TASK:
Your task is to generate a creative, descriptive, and inspiring music prompt for our music generation AI.

- If the "Current Prompt" is NOT empty, creatively rewrite and expand upon it to make it more vivid and detailed.
- If the "Current Prompt" IS empty, generate a completely new and original prompt from scratch.

In either case, you MUST incorporate ideas from the other context fields (genres, artists, lyrics) if they are provided. The goal is a rich, evocative prompt. Return a JSON object with a single key "prompt".`;

    const result = await runStructuredPrompt(
      SUGGESTION_SYSTEM_INSTRUCTION,
      userPrompt,
      PROMPT_SCHEMA,
      0.9
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('[api/enhance-prompt] Failure', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
