import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_AI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI?.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function enhancePrompt(prompt: string): Promise<string> {
  if (!model) return `Enhanced: ${prompt} (mock response - no API key)`;

  try {
    const result = await model.generateContent(`Enhance this music prompt for better AI generation: ${prompt}`);
    return result.response.text();
  } catch (error) {
    console.error('Gemini enhancePrompt error:', error);
    return `Enhanced: ${prompt} (fallback)`;
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