import type { MusicPlan, VideoStyle } from '../../../lib/types';

// Avoid importing the Node-only `@google/genai` SDK at module evaluation time.
// We'll dynamically import it only when running in a server/Node environment
// and when an API key is provided. This prevents bundlers from including
// the SDK in the browser bundle and avoids runtime crashes in the client.

const apiKey = process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
    console.warn(
        '[MuseWave] GOOGLE_AI_API_KEY is missing. Using mock offline responses instead of live Google GenAI.'
    );
}

let ai: any = null;

// ... existing code ...</content>
<parameter name="filePath">/Users/Anchit.Tandon/Desktop/AI HUSTLE - APPS/MuseWave3/backend/src/services/geminiService.ts