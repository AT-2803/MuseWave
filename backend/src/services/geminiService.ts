import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_AI_API_KEY;
console.log('Google AI API Key present:', !!apiKey);
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
console.log('GenAI initialized:', !!genAI);
const model = genAI?.getGenerativeModel({ model: 'gemini-1.5-flash' });
console.log('Model initialized:', !!model);

export async function enhancePrompt(prompt: string): Promise<string> {
  console.log('Calling enhancePrompt with model:', !!model);
  if (!model) return `Enhanced: ${prompt} (mock response - no model)`;

  try {
    console.log('Making API call');
    const result = await model.generateContent(`Enhance this music prompt for better AI generation: ${prompt}`);
    console.log('API call successful');
    return result.response.text();
  } catch (error) {
    console.error('Gemini enhancePrompt error:', error);
    return `Enhanced: ${prompt} (API error: ${(error as Error).message})`;
  }
}

export async function suggestGenres(prompt: string): Promise<string[]> {
  if (!model) return ['pop', 'rock', 'electronic'];

  try {
    const result = await model.generateContent(`Suggest 3 music genres for this prompt: ${prompt}. Return as comma-separated list.`);
    const text = result.response.text();
    return text.split(',').map((g: string) => g.trim()).slice(0, 3);
  } catch (error) {
    console.error('Gemini suggestGenres error:', error);
    return ['pop', 'rock', 'electronic'];
  }
}

export async function generateMusicPlan(prompt: string, genre: string): Promise<any> {
  if (!model) return { plan: 'Mock plan', structure: ['intro', 'verse', 'chorus'] };

  try {
    const result = await model.generateContent(`Generate a music plan for: ${prompt} in ${genre} genre. Include structure, key, tempo. Return as JSON.`);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini generateMusicPlan error:', error);
    return { plan: 'Fallback plan', structure: ['intro', 'verse', 'chorus'] };
  }
}

export async function auditMusicPlan(plan: any): Promise<string> {
  if (!model) return 'Mock audit: Plan looks good.';

  try {
    const result = await model.generateContent(`Audit this music plan: ${JSON.stringify(plan)}. Provide feedback.`);
    return result.response.text();
  } catch (error) {
    console.error('Gemini auditMusicPlan error:', error);
    return 'Fallback audit: Plan is acceptable.';
  }
}

export async function suggestArtists(prompt: string): Promise<string[]> {
  if (!model) return ['Artist1', 'Artist2', 'Artist3'];

  try {
    const result = await model.generateContent(`Suggest 3 artists similar to this prompt: ${prompt}. Return as comma-separated list.`);
    const text = result.response.text();
    return text.split(',').map((a: string) => a.trim()).slice(0, 3);
  } catch (error) {
    console.error('Gemini suggestArtists error:', error);
    return ['Artist1', 'Artist2', 'Artist3'];
  }
}

export async function suggestLanguages(prompt: string): Promise<string[]> {
  if (!model) return ['English', 'Spanish', 'French'];

  try {
    const result = await model.generateContent(`Suggest 3 languages for this music prompt: ${prompt}. Return as comma-separated list.`);
    const text = result.response.text();
    return text.split(',').map((l: string) => l.trim()).slice(0, 3);
  } catch (error) {
    console.error('Gemini suggestLanguages error:', error);
    return ['English', 'Spanish', 'French'];
  }
}

export async function enhanceLyrics(lyrics: string): Promise<string> {
  if (!model) return `Enhanced: ${lyrics} (mock response - no model)`;

  try {
    const result = await model.generateContent(`Enhance these lyrics for better music generation: ${lyrics}`);
    return result.response.text();
  } catch (error) {
    console.error('Gemini enhanceLyrics error:', error);
    return `Enhanced: ${lyrics} (API error: ${(error as Error).message})`;
  }
}