import { GoogleGenAI } from '@google/genai';
import type { Content } from '@google/genai';

let cachedClient: GoogleGenAI | null = null;

const suggestionSystemInstruction = `You are an AI Musicologist and expert DJ assistant for MuseForge Pro. Your knowledge is vast, current, and encyclopedic, mirroring a real-time connection to every piece of music data on the internet. You are deeply familiar with:

1.  **Music Theory & History:** From classical harmony to modern microtonal music.
2.  **Production Techniques:** Synthesis, mixing, mastering, and the signature sounds of various genres.
3.  **DJ Culture & Practice:** Song structure for mixing (e.g., intros/outros), harmonic mixing (key compatibility), energy flow management, and the needs of professional DJs.
4.  **The Entire Global Music Landscape:** This includes:
    - **Historical Icons:** All foundational artists from every genre.
    - **Current & Trending Artists:** You are an expert on contemporary scenes and artists like Fred again.., Anyma, Skrillex, Bicep, Peggy Gou, and underground scenes. You know who is currently popular and influential.
    - **Niche & Obscure Genres:** You can provide deep cuts and unique suggestions beyond the mainstream.

Your primary goal is to provide **world-class, non-generic, and inspiring suggestions** that are directly relevant to the user's input. Your suggestions should feel like they are coming from a seasoned industry professional who is passionate about music.`;

function getClient() {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable');
  }
  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

export async function runStructuredPrompt(
  systemInstruction: string,
  userPrompt: string,
  schema: unknown,
  temperature = 0.9
) {
  const client = getClient();
  const prompt = `${systemInstruction.trim()}\n\n${userPrompt.trim()}`;

  const contents: Content[] = [
    {
      role: 'user',
      parts: [{ text: prompt }],
    },
  ];

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature,
    },
  });

  const raw =
    response.text ??
    response.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('')
      .trim();

  if (!raw) {
    throw new Error('Received empty response from Gemini.');
  }

  return JSON.parse(raw);
}

export const SUGGESTION_SYSTEM_INSTRUCTION = suggestionSystemInstruction;
