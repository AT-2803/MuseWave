import type { MusicPlan } from '../lib/types';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error(
        '[MuseWave] GEMINI_API_KEY is required. Set VITE_GEMINI_API_KEY in .env.local'
    );
}

let ai: any = null;

async function getAIClient() {
    if (ai) return ai;
    
    if (typeof window !== 'undefined') {
        throw new Error('AI client must be initialized server-side only');
    }
    
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    ai = new GoogleGenerativeAI(apiKey);
    return ai;
}

const callGemini = async (systemInstruction: string, userPrompt: string, schema: any) => {
    const client = await getAIClient();
    const model = client.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction,
        generationConfig: {
            temperature: 0.9,
            responseMimeType: "application/json",
            responseSchema: schema
        }
    });
    
    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    
    if (!text) {
        throw new Error("Empty response from Gemini AI");
    }
    
    return JSON.parse(text);
};

const suggestionSystemInstruction = `You are an AI Musicologist and expert DJ assistant for MuseForge Pro. Your knowledge spans music theory, production techniques, DJ culture, and the entire global music landscape (2025). Deliver hyper-relevant, innovative suggestions that elevate the user's creative vision.`;

export const enhancePrompt = async (context: any) => {
    const userPrompt = `
CONTEXT:
- Current Prompt: "${context.prompt || '(empty)'}"
- Genres: ${context.genres?.join(', ') || 'None'}
- Artists: ${context.artists?.join(', ') || 'None'}
- Lyrics: "${context.lyrics || 'None'}"

Create a vivid 50-100 word music prompt. If Current Prompt is NOT empty, amplify it with production details and emotional layers. If empty, invent an original concept using the context. Use poetic, sensory language.

Return ONLY JSON: {"prompt": "your enhanced prompt"}`;

    return callGemini(suggestionSystemInstruction, userPrompt, {
        type: 'object',
        properties: { prompt: { type: 'string' } },
        required: ['prompt']
    });
};

export const suggestGenres = async (context: any) => {
    const userPrompt = `
CONTEXT:
- Prompt: "${context.prompt}"
- Artists: ${context.artists?.join(', ') || 'None'}
- Lyrics: "${context.lyrics || 'None'}"

Suggest 3-5 music genres matching this vision. Prioritize 2025 trends and cultural fusions. Ensure diversity and avoid repetition with existing: ${context.genres?.join(', ') || 'None'}

Return ONLY JSON: {"genres": ["genre1", "genre2", ...]}`;

    return callGemini(suggestionSystemInstruction, userPrompt, {
        type: 'object',
        properties: { genres: { type: 'array', items: { type: 'string' } } },
        required: ['genres']
    });
};

export const suggestArtists = async (context: any) => {
    const userPrompt = `
CONTEXT:
- Prompt: "${context.prompt}"
- Genres: ${context.genres?.join(', ') || 'None'}
- Lyrics: "${context.lyrics || 'None'}"

Recommend 3-5 artists (mix of icons and 2025 rising stars) that resonate with this vision. Balance classics and trends, ensure genre alignment and cultural diversity.

Return ONLY JSON: {"artists": ["Artist1", "Artist2", ...]}`;

    return callGemini(suggestionSystemInstruction, userPrompt, {
        type: 'object',
        properties: { artists: { type: 'array', items: { type: 'string' } } },
        required: ['artists']
    });
};

export const suggestLanguages = async (context: any) => {
    const userPrompt = `
CONTEXT:
- Prompt: "${context.prompt}"
- Genres: ${context.genres?.join(', ') || 'None'}
- Artists: ${context.artists?.join(', ') || 'None'}
- Current: ${context.languages?.join(', ') || 'None'}

Recommend 1-3 vocal languages matching genre/cultural tone. Include English if crossover appeal likely.

Return ONLY JSON: {"languages": ["Language1", ...]}`;

    return callGemini(suggestionSystemInstruction, userPrompt, {
        type: 'object',
        properties: { languages: { type: 'array', items: { type: 'string' } } },
        required: ['languages']
    });
};

export const suggestInstruments = async (context: any) => {
    const userPrompt = `
CONTEXT:
- Prompt: "${context.prompt}"
- Genres: ${context.genres?.join(', ') || 'None'}
- Artists: ${context.artists?.join(', ') || 'None'}

Suggest 3-5 production elements/instruments for this track. Focus on innovative, genre-appropriate choices.

Return ONLY JSON: {"instruments": ["Instrument1", ...]}`;

    return callGemini(suggestionSystemInstruction, userPrompt, {
        type: 'object',
        properties: { instruments: { type: 'array', items: { type: 'string' } } },
        required: ['instruments']
    });
};

export const enhanceLyrics = async (context: any) => {
    const userPrompt = `
CONTEXT:
- Prompt: "${context.prompt}"
- Genres: ${context.genres?.join(', ') || 'None'}
- Current Lyrics: "${context.lyrics || 'None'}"
- Duration: ${context.duration}s

Expand/rewrite lyrics into complete theme for ${context.duration}s song. Structure with sections (Verse, Chorus).

Return ONLY JSON: {"lyrics": "full lyrics text"}`;

    return callGemini(suggestionSystemInstruction, userPrompt, {
        type: 'object',
        properties: { lyrics: { type: 'string' } },
        required: ['lyrics']
    });
};

export async function generateMusicPlan(fullPrompt: any, creativitySeed: number): Promise<MusicPlan> {
    const systemInstruction = `You are MuseForge Pro, expert AI composer generating detailed music plans. 

CRITICAL DIRECTIVES:
1. VARY chord progressions and mixing effects between sections - NO repetition
2. Use creativitySeed (${creativitySeed}) for randomness
3. If lyrics provided, MUST incorporate as sung melody with leadMelody for each lyrical section
4. DJ-friendly structure with intro/outro, build-ups, drops
5. Strict JSON schema adherence`;

    // Create concise prompt instead of full JSON dump
    const userPrompt = `Generate music plan:
- Prompt: "${fullPrompt.musicPrompt || ''}"
- Genres: ${fullPrompt.genres?.join(', ') || 'electronic'}
- Duration: ${fullPrompt.duration || 90}s
- Artists: ${fullPrompt.artistInspiration?.join(', ') || 'none'}
- Lyrics: ${fullPrompt.lyrics ? 'Yes (include in sections)' : 'No'}
- Seed: ${creativitySeed}`;

    const schema = {
        type: 'object',
        properties: {
            title: { type: 'string' },
            genre: { type: 'string' },
            bpm: { type: 'number' },
            key: { type: 'string' },
            overallStructure: { type: 'string' },
            vocalStyle: { type: 'string' },
            lyrics: { type: 'string' },
            randomSeed: { type: 'number' },
            sections: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        sectionType: { type: 'string', enum: ['intro', 'verse', 'chorus', 'bridge', 'breakdown', 'drop', 'outro'] },
                        durationBars: { type: 'number' },
                        chordProgression: { type: 'array', items: { type: 'string' } },
                        drumPattern: {
                            type: 'object',
                            properties: {
                                kick: { type: 'array', items: { type: 'number' } },
                                snare: { type: 'array', items: { type: 'number' } },
                                hihat: { type: 'array', items: { type: 'number' } }
                            },
                            required: ['kick', 'snare', 'hihat']
                        },
                        synthLine: {
                            type: 'object',
                            properties: {
                                pattern: { type: 'string', enum: ['pads', 'arpeggio-up', 'arpeggio-down'] },
                                timbre: { type: 'string', enum: ['warm', 'bright', 'dark', 'glassy'] }
                            },
                            required: ['pattern', 'timbre']
                        },
                        leadMelody: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    note: { type: 'string' },
                                    duration: { type: 'number' },
                                    ornamentation: { type: 'string', enum: ['none', 'light', 'heavy'] }
                                },
                                required: ['note', 'duration', 'ornamentation']
                            }
                        },
                        effects: {
                            type: 'object',
                            properties: {
                                reverb: { type: 'number' },
                                compressionThreshold: { type: 'number' },
                                stereoWidth: { type: 'number' }
                            },
                            required: ['reverb', 'compressionThreshold', 'stereoWidth']
                        },
                        lyrics: { type: 'string', nullable: true }
                    },
                    required: ['name', 'sectionType', 'durationBars', 'chordProgression', 'drumPattern', 'synthLine', 'leadMelody', 'effects']
                }
            },
            stems: {
                type: 'object',
                properties: {
                    vocals: { type: 'boolean' },
                    drums: { type: 'boolean' },
                    bass: { type: 'boolean' },
                    instruments: { type: 'boolean' }
                },
                required: ['vocals', 'drums', 'bass', 'instruments']
            },
            cuePoints: {
                type: 'object',
                properties: {
                    introEnd: { type: 'number' },
                    dropStart: { type: 'number' },
                    outroStart: { type: 'number' }
                },
                required: ['introEnd', 'dropStart', 'outroStart']
            }
        },
        required: ['title', 'genre', 'bpm', 'key', 'overallStructure', 'vocalStyle', 'lyrics', 'randomSeed', 'sections', 'stems', 'cuePoints']
    };

    return callGemini(systemInstruction, userPrompt, schema);
}

export async function auditMusicPlan(plan: MusicPlan, originalRequest: any) {
    const systemInstruction = `You are QA agent for MuseForge Pro. Audit generated plan against request and quality directives. Be strict and objective.`;
    
    // Create concise audit prompt
    const userPrompt = `Audit music plan:
REQUEST: ${originalRequest.musicPrompt || ''} (${originalRequest.genres?.join(', ') || 'electronic'})
PLAN: ${plan.title} | ${plan.bpm} BPM | ${plan.key} | ${plan.sections?.length || 0} sections
Lyrics requested: ${originalRequest.lyrics ? 'Yes' : 'No'}

AUDIT CHECKLIST:
1. lyricsSung: Lyrics in vocal sections with leadMelody?
2. isUnique: Variation in chords/structure/effects?
3. styleFaithful: Matches requested genres/artists?
4. djStructure: Has intro/outro and drop/breakdown?
5. masteringApplied: Mixing notes present?

Set 'passed' true only if ALL checks satisfy.`;

    const schema = {
        type: 'object',
        properties: {
            lyricsSung: { type: 'boolean' },
            isUnique: { type: 'boolean' },
            styleFaithful: { type: 'boolean' },
            djStructure: { type: 'boolean' },
            masteringApplied: { type: 'boolean' },
            passed: { type: 'boolean' },
            feedback: { type: 'string' }
        },
        required: ['lyricsSung', 'isUnique', 'styleFaithful', 'djStructure', 'masteringApplied', 'passed', 'feedback']
    };

    return callGemini(systemInstruction, userPrompt, schema);
}

export async function generateCreativeAssets(musicPlan: MusicPlan, videoStyles: string[], lyrics: string) {
    const systemInstruction = `You are creative director AI for MuseForge Pro. Generate time-coded lyric alignment and video storyboards.`;
    
    // Create concise creative assets prompt
    const userPrompt = `Generate creative assets:
PLAN: ${musicPlan.title} | ${musicPlan.bpm} BPM | ${musicPlan.genre}
Sections: ${musicPlan.sections?.map((s: any) => s.name).join(', ') || 'standard'}
Video Styles: ${videoStyles.join(', ') || 'None'}
Lyrics: ${lyrics ? 'Yes (time-code them)' : 'No'}

TASK:
1. Lyrics Alignment: Time ranges for lyric lines (empty if no lyrics)
2. Video Storyboards: One sentence per requested style`;

    const schema = {
        type: 'object',
        properties: {
            lyricsAlignment: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        time: { type: 'string' },
                        line: { type: 'string' }
                    },
                    required: ['time', 'line']
                }
            },
            videoStoryboard: {
                type: 'object',
                properties: {
                    lyrical: { type: 'string', nullable: true },
                    official: { type: 'string', nullable: true },
                    abstract: { type: 'string', nullable: true }
                }
            }
        },
        required: ['lyricsAlignment', 'videoStoryboard']
    };

    return callGemini(systemInstruction, userPrompt, schema);
}
