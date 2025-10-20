import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { logger } from '../logger.js';
export class SafetyService {
    genAI;
    constructor() {
        if (config.GEMINI_API_KEY) {
            this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
        }
    }
    async checkContent(prompt) {
        if (!this.genAI) {
            // Mock safety check
            return this.mockSafetyCheck(prompt);
        }
        const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
        const safetyPrompt = `
Analyze this music generation prompt for safety and appropriateness:

"${prompt}"

Check for:
- Harmful or violent content
- Hate speech or discrimination
- Explicit sexual content
- Illegal activities
- Copyright infringement requests

Return a JSON object:
{
  "safe": true/false,
  "reason": "explanation if unsafe",
  "suggestions": ["alternative suggestions if unsafe"]
}
`;
        try {
            const result = await model.generateContent(safetyPrompt);
            const response = result.response;
            const text = response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON in safety response');
            }
            const safety = JSON.parse(jsonMatch[0]);
            return safety;
        }
        catch (error) {
            logger.error({ error }, 'Safety check failed, allowing content');
            return { safe: true };
        }
    }
    mockSafetyCheck(prompt) {
        // Simple mock - reject if contains certain words
        const unsafeWords = ['violence', 'hate', 'illegal', 'explicit'];
        for (const word of unsafeWords) {
            if (prompt.toLowerCase().includes(word)) {
                return {
                    safe: false,
                    reason: `Contains potentially unsafe content: ${word}`,
                    suggestions: ['Please rephrase your request to be more positive and appropriate']
                };
            }
        }
        return { safe: true };
    }
}
export const safetyService = new SafetyService();
