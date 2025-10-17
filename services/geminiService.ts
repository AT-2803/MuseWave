import type { MusicPlan, VideoStyle } from '../lib/types';

// Avoid importing the Node-only `@google/genai` SDK at module evaluation time.
// We'll dynamically import it only when running in a server/Node environment
// and when an API key is provided. This prevents bundlers from including
// the SDK in the browser bundle and avoids runtime crashes in the client.

const apiKey = process.env.API_KEY;
if (!apiKey) {
    console.warn(
        '[MuseWave] GEMINI_API_KEY is missing. Using mock offline responses instead of live Google GenAI.'
    );
}

let ai: any = null;

const fallbackGenrePool = [
    'synthwave',
    'deep house',
    'future garage',
    'progressive house',
    'melodic techno',
    'downtempo',
    'lofi house',
    'breakbeat',
    'drum & bass',
    'hyperpop',
    'afrobeats',
    'trap',
    'hip-hop',
    'trap soul',
    'uk garage',
    'electro swing',
    'cinematic electronica',
    'ambient techno',
    'psytrance',
    'future bass',
    'neo-soul',
    'phonk',
    'dark wave',
    'idm',
    'glitch hop',
    'latin house',
    'baile funk',
    'vaporwave',
    'chillwave',
    'lofi hip hop',
];

const fallbackArtistPool: Record<string, string[]> = {
    default: ['Kaytranada', 'Fred again..', 'ODESZA', 'Caribou', 'Anyma', 'Charlotte de Witte', 'Peggy Gou', 'Jamie xx'],
    ambient: ['Jon Hopkins', 'Helios', 'Tycho', 'Brian Eno', 'Bonobo', 'Nils Frahm'],
    techno: ['Bicep', 'Ben Böhmer', 'Amelie Lens', 'Stephan Bodzin', 'Reinier Zonneveld'],
    house: ['Purple Disco Machine', 'Disclosure', 'Chris Lake', 'Diplo', 'Duke Dumont'],
    pop: ['Dua Lipa', 'The Weeknd', 'Billie Eilish', 'Charli XCX'],
    trap: ['Metro Boomin', 'RL Grime', 'Flume', 'Baauer'],
    bass: ['Sub Focus', 'Skrillex', 'Alison Wonderland', 'Seven Lions'],
    latin: ['Bad Bunny', 'ROSALÍA', 'J Balvin', 'Rauw Alejandro'],
};

const fallbackLanguagePool = [
    'English',
    'Spanish',
    'Hindi',
    'French',
    'German',
    'Japanese',
    'Korean',
    'Portuguese',
    'Italian',
    'Tamil',
    'Telugu',
    'Bengali',
    'Mandarin',
    'Arabic',
    'Yoruba',
];

const promptTextures = ['glassine pads', 'pulsing bass lines', 'fractaled arpeggios', 'cinematic swells', 'granular vocal chops', 'stuttering percussion', 'analog synth blooms'];
const promptSettings = ['neon skyline', 'midnight rooftop', 'desert rave', 'immersive light installation', 'tidal undercurrent', 'future noir city', 'celestial observatory'];
const promptGrooves = ['polyrhythmic groove', 'syncopated rhythm', 'rolling halftime swing', 'four-on-the-floor drive', 'broken beat shuffle'];
const genreKeywordMap: { pattern: RegExp; genres: string[] }[] = [
    { pattern: /(ambient|atmosphere|cinematic|drone|space)/i, genres: ['ambient', 'cinematic electronica', 'downtempo'] },
    { pattern: /(club|dance|floor|dj|house|groove)/i, genres: ['deep house', 'tech-house', 'uk garage'] },
    { pattern: /(bass|808|trap|drill|grime)/i, genres: ['trap', 'future bass', 'phonk'] },
    { pattern: /(sunset|chill|relax|study|lofi|vibes)/i, genres: ['lofi house', 'chillwave', 'vaporwave'] },
    { pattern: /(festival|anthem|uplift|epic|rave)/i, genres: ['progressive house', 'melodic techno', 'psytrance'] },
    { pattern: /(latin|tropical|summer|carnival)/i, genres: ['latin house', 'afrobeats', 'baile funk'] },
    { pattern: /(hip\s?hop|rap|boom bap)/i, genres: ['hip-hop', 'trap soul', 'lofi hip hop'] },
];
const lyricImagery = ['neon horizons', 'holographic rain', 'midnight skylines', 'gravity waves', 'aurora pulse', 'glass cathedral lights', 'silver dawn tides'];
const lyricMotifs = ['we chase the memory', 'hearts in overdrive', 'signals intertwine', 'echoes we design', 'static turns to gold', 'we bloom in afterglow'];
const lyricPayoffs = ['we never fade away', 'tonight we stay awake', 'we find a brighter way', 'our pulse will never break', 'together we elevate'];

let lastPromptMock = '';
let lastGenresMock: string[] = [];
let lastArtistsMock: string[] = [];
let lastLanguagesMock: string[] = [];
let lastLyricsMock = '';

function hashString(value: string) {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function createSeededRng(seed: number) {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0xffffffff;
    };
}

function pickUnique(pool: string[], count: number, rng: () => number, exclude: string[] = []) {
    const normalizedExclude = new Set(exclude.map((value) => value.toLowerCase()));
    const working = pool.filter((item) => !normalizedExclude.has(item.toLowerCase()));
    const result: string[] = [];
    const used = new Set<string>();
    while (working.length && result.length < count) {
        const index = Math.floor(rng() * working.length);
        const value = working[index];
        if (used.has(value.toLowerCase())) continue;
        used.add(value.toLowerCase());
        result.push(value);
        working.splice(index, 1);
    }
    return result;
}

function arraysEqual(a: string[], b: string[]) {
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
}

function ensureDifferentArray(generate: (attempt: number) => string[], previous: string[]) {
    let attempt = 0;
    let next = generate(attempt);
    while (arraysEqual(next, previous) && attempt < 3) {
        attempt += 1;
        next = generate(attempt);
    }
    return next;
}

function ensureDifferentString(generate: (attempt: number) => string, previous: string) {
    let attempt = 0;
    let next = generate(attempt);
    while (next === previous && attempt < 3) {
        attempt += 1;
        next = generate(attempt);
    }
    return next;
}

function capitalizePhrase(value: string) {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}

async function getAIClient() {
    if (ai) return ai;
    if (!apiKey) return null;
    // Do not attempt to initialize the server SDK from the browser.
    if (typeof window !== 'undefined') return null;
    try {
        const mod = await import('@google/genai');
        const { GoogleGenAI } = mod as any;
        ai = new GoogleGenAI({ apiKey });
        return ai;
    } catch (err) {
        console.warn('[MuseWave] Failed to dynamically import @google/genai:', err);
        return null;
    }
}

// Use plain JSON Schema shapes (string types) so the module doesn't depend on
// `Type` constants from the SDK at module load time. These are only used when
// calling the remote AI; when running locally in the browser we use mock flows.
const musicPlanSchema = {
    type: 'object',
    properties: {
        title: { type: 'string', description: 'A creative title for the song.' },
        genre: { type: 'string', description: 'The primary genre of the song, derived from user input.' },
        bpm: { type: 'number', description: 'The tempo of the song in beats per minute (e.g., 120).' },
        key: { type: 'string', description: "The musical key of the song (e.g., 'C Minor', 'F# Major')." },
        overallStructure: { type: 'string', description: "A brief description of the song's arrangement and energy flow." },
        vocalStyle: { type: 'string', description: 'A description of the synthesized vocal style.' },
        lyrics: { type: 'string', description: 'The full lyrics to be sung in the song.' },
        randomSeed: { type: 'number', description: 'The numeric seed used to ensure creative uniqueness for this specific plan.' },
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
                            kick: { type: 'array', items: { type: 'number' }, nullable: true },
                            snare: { type: 'array', items: { type: 'number' }, nullable: true },
                            hihat: { type: 'array', items: { type: 'number' }, nullable: true },
                        },
                        required: ['kick', 'snare', 'hihat']
                    },
                    synthLine: {
                        type: 'object',
                        properties: {
                            pattern: { type: 'string', enum: ['pads', 'arpeggio-up', 'arpeggio-down'] },
                            timbre: { type: 'string', enum: ['warm', 'bright', 'dark', 'glassy'] },
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
                                ornamentation: { type: 'string', enum: ['none', 'light', 'heavy'] },
                            },
                            required: ['note', 'duration', 'ornamentation']
                        }
                    },
                    effects: {
                        type: 'object',
                        properties: {
                            reverb: { type: 'number' },
                            compressionThreshold: { type: 'number' },
                            stereoWidth: { type: 'number' },
                        },
                        required: ['reverb', 'compressionThreshold', 'stereoWidth']
                    },
                    lyrics: { type: 'string', description: 'The lyrics for this specific section. Leave empty for instrumental sections.', nullable: true },
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
                instruments: { type: 'boolean' },
            },
            required: ['vocals', 'drums', 'bass', 'instruments']
        },
        cuePoints: {
            type: 'object',
            properties: {
                introEnd: { type: 'number' },
                dropStart: { type: 'number' },
                outroStart: { type: 'number' },
            },
            required: ['introEnd', 'dropStart', 'outroStart']
        }
    },
    required: ['title', 'genre', 'bpm', 'key', 'overallStructure', 'vocalStyle', 'lyrics', 'randomSeed', 'sections', 'stems', 'cuePoints']
};

const auditSchema = {
    type: 'object',
    properties: {
        lyricsSung: { type: 'boolean' },
        isUnique: { type: 'boolean' },
        styleFaithful: { type: 'boolean' },
        djStructure: { type: 'boolean' },
        masteringApplied: { type: 'boolean' },
        passed: { type: 'boolean' },
        feedback: { type: 'string' },
    },
    required: ['lyricsSung', 'isUnique', 'styleFaithful', 'djStructure', 'masteringApplied', 'passed', 'feedback']
};

const creativeAssetsSchema = {
    type: 'object',
    properties: {
        lyricsAlignment: {
            type: 'array',
            description: 'Time-coded alignment of lyrics. Should be an empty array if no lyrics were provided in the input.',
            items: {
                type: 'object',
                properties: {
                    time: { type: 'string', description: "Time range for the line (e.g., '0s-10s')." },
                    line: { type: 'string', description: 'The lyric line.' }
                },
                required: ['time', 'line']
            }
        },
        videoStoryboard: {
            type: 'object',
            description: 'Concise storyboards for each requested video style. Keys for non-requested styles should be omitted.',
            properties: {
                lyrical: { type: 'string', description: 'Storyboard for the lyrical video.', nullable: true },
                official: { type: 'string', description: 'Storyboard for the official music video.', nullable: true },
                abstract: { type: 'string', description: 'Storyboard for the abstract visualizer.', nullable: true }
            }
        }
    },
    required: ['lyricsAlignment', 'videoStoryboard']
};


const callGemini = async (systemInstruction: string, userPrompt: string, schema: any) => {
    // If a server base URL is configured at build time, forward calls to server endpoints
    const base = (typeof window !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) || process.env.API_BASE_URL || null;
    if (base && typeof window !== 'undefined') {
        // Route a small set of helper endpoints to the server for browser usage
        const route = (endpoint: string) => `${base.replace(/\/$/, '')}${endpoint}`;
        // Very small heuristic: if the user prompt includes 'suggest genres', call suggest-genres
        // But to keep it simple, callers of callGemini always pass a systemInstruction; client-level helpers use dedicated endpoints.
        throw new Error('callGemini should not be invoked from the browser. Use the high-level helpers instead.');
    }
    if (!ai) {
        throw new Error("AI client not configured");
    }
    try {
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.9,
            },
        });
        const text = result.text;
        if (!text) {
            throw new Error("Received an empty response from the AI.");
        }
        return JSON.parse(text);
    } catch (error) {
        console.error("Full AI Error Details:", error); 
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        const detailedMessage = (error as any)?.response?.data?.error?.message || errorMessage;
        throw new Error(`AI generation failed. Reason: ${detailedMessage}`);
    }
}

// --- Suggestion Functions (Cascading Context) ---
const suggestionSystemInstruction = `You are an AI Musicologist and expert DJ assistant for MuseForge Pro. Your knowledge is vast, current, and encyclopedic, mirroring a real-time connection to every piece of music data on the internet. You are deeply familiar with:

1.  **Music Theory & History:** From classical harmony to modern microtonal music.
2.  **Production Techniques:** Synthesis, mixing, mastering, and the signature sounds of various genres.
3.  **DJ Culture & Practice:** Song structure for mixing (e.g., intros/outros), harmonic mixing (key compatibility), energy flow management, and the needs of professional DJs.
4.  **The Entire Global Music Landscape:** This includes:
    - **Historical Icons:** All foundational artists from every genre.
    - **Current & Trending Artists:** You are an expert on contemporary scenes and artists like Fred again.., Anyma, Skrillex, Bicep, Peggy Gou, and underground scenes. You know who is currently popular and influential.
    - **Niche & Obscure Genres:** You can provide deep cuts and unique suggestions beyond the mainstream.

Your primary goal is to provide **world-class, non-generic, and inspiring suggestions** that are directly relevant to the user's input. Your suggestions should feel like they are coming from a seasoned industry professional who is passionate about music.`;

export const enhancePrompt = async (context: any) => {
    const API_BASE = typeof window !== 'undefined' ? (import.meta as any).env?.VITE_API_BASE_URL || null : null;
    if (typeof window !== 'undefined' && API_BASE) {
        const resp = await fetch(`${API_BASE.replace(/\/$/, '')}/api/enhance-prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context }) });
        return resp.json();
    }
    if (!ai) {
        const generator = (attempt: number) => {
            const seed = hashString(
                `${context.prompt || ''}|${context.genres?.join(',') || ''}|${context.artists?.join(',') || ''}|${context.lyrics || ''}|${Date.now()}|${attempt}`
            );
            const rng = createSeededRng(seed);
            const genreFocus =
                context.genres && context.genres.length
                    ? context.genres.join(' / ')
                    : pickUnique(fallbackGenrePool, 2, rng).join(' / ');
            const artistLine =
                context.artists && context.artists.length
                    ? `Inspired by ${context.artists.join(', ')}`
                    : `Channeling ${pickUnique(fallbackArtistPool.default, 2, rng).join(' & ')}`;
            const groove = pickUnique(promptGrooves, 1, rng)[0];
            const setting = pickUnique(promptSettings, 1, rng)[0];
            const textures = pickUnique(promptTextures, 2, rng);
            return `Forge a ${genreFocus} anthem with a ${groove}, ${artistLine}. Set it within a ${setting}, weaving ${textures[0]} and ${textures[1]} around ${context.lyrics ? 'lyrical themes about ' + context.lyrics.slice(0, 80) : 'wordless vocal atmospherics'}.`;
        };
        const prompt = ensureDifferentString(generator, lastPromptMock);
        lastPromptMock = prompt;
        return { prompt };
    }
    const userPrompt = `
CONTEXT:
- Current Prompt: "${context.prompt || '(empty)'}"
- Selected Genres: ${context.genres.join(', ') || 'None'}
- Artist Influences: ${context.artists.join(', ') || 'None'}
- Lyrical Theme: "${context.lyrics || 'None'}"

TASK:
Your task is to generate a creative, descriptive, and inspiring music prompt for our music generation AI.

- If the "Current Prompt" is NOT empty, creatively rewrite and expand upon it to make it more vivid and detailed.
- If the "Current Prompt" IS empty, generate a completely new and original prompt from scratch.

In either case, you MUST incorporate ideas from the other context fields (genres, artists, lyrics) if they are provided. The goal is a rich, evocative prompt. Return a JSON object with a single key "prompt".`;
    return callGemini(suggestionSystemInstruction, userPrompt, { type: 'object', properties: { prompt: { type: 'string' } } });
}

export const suggestGenres = async (context: any) => {
    const API_BASE = typeof window !== 'undefined' ? (import.meta as any).env?.VITE_API_BASE_URL || null : null;
    if (typeof window !== 'undefined' && API_BASE) {
        const resp = await fetch(`${API_BASE.replace(/\/$/, '')}/api/suggest-genres`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context }) });
        return resp.json();
    }
    if (!ai) {
        const generator = (attempt: number) => {
            const corpus = `${context.prompt || ''} ${context.lyrics || ''} ${context.artists?.join(' ') || ''}`;
            const seed = hashString(`${corpus}|${Date.now()}|${attempt}`);
            const rng = createSeededRng(seed);
            const derived = new Set<string>();
            genreKeywordMap.forEach(({ pattern, genres }) => {
                if (pattern.test(corpus)) {
                    genres.forEach((genre) => derived.add(genre));
                }
            });
            const desired = 3 + Math.floor(rng() * 2);
            const combinedPool = Array.from(new Set([...Array.from(derived), ...fallbackGenrePool]));
            let picks = pickUnique(combinedPool, desired, rng, context.genres || []);
            if (!picks.length) {
                picks = pickUnique(fallbackGenrePool, desired, rng, context.genres || []);
            }
            return picks.map((genre) => genre.replace(/\s+/g, ' ').trim());
        };
        const genres = ensureDifferentArray(generator, lastGenresMock);
        lastGenresMock = genres;
        return { genres };
    }
    const userPrompt = `
CONTEXT:
- Current Prompt: "${context.prompt}"
- Artist Influences: ${context.artists.join(', ') || 'None'}
- Lyrical Theme: "${context.lyrics || 'None'}"

TASK:
Based on the provided context and your vast knowledge of music history and current trends, suggest 3-5 relevant genres. Return a JSON object with a single key "genres" which is an array of strings.`;
     return callGemini(suggestionSystemInstruction, userPrompt, { type: 'object', properties: { genres: { type: 'array', items: { type: 'string' } } } });
}

export const suggestArtists = async (context: any) => {
    const API_BASE = typeof window !== 'undefined' ? (import.meta as any).env?.VITE_API_BASE_URL || null : null;
    if (typeof window !== 'undefined' && API_BASE) {
        const resp = await fetch(`${API_BASE.replace(/\/$/, '')}/api/suggest-artists`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context }) });
        return resp.json();
    }
    if (!ai) {
        const generator = (attempt: number) => {
            const seed = hashString(`${context.genres?.join(',') || ''}|${context.prompt || ''}|${Date.now()}|${attempt}`);
            const rng = createSeededRng(seed);
            const primaryGenres = (context.genres || []).map((genre: string) => genre.toLowerCase());
            const matchedPools: string[] = [];
            primaryGenres.forEach((genre) => {
                if (genre.includes('ambient') || genre.includes('cinematic')) matchedPools.push(...(fallbackArtistPool.ambient || []));
                if (genre.includes('techno') || genre.includes('trance')) matchedPools.push(...(fallbackArtistPool.techno || []));
                if (genre.includes('house')) matchedPools.push(...(fallbackArtistPool.house || []));
                if (genre.includes('trap') || genre.includes('bass')) matchedPools.push(...(fallbackArtistPool.trap || []));
                if (genre.includes('latin') || genre.includes('afro')) matchedPools.push(...(fallbackArtistPool.latin || []));
                if (genre.includes('pop') || genre.includes('hyperpop')) matchedPools.push(...(fallbackArtistPool.pop || []));
                if (genre.includes('drum') || genre.includes('bass')) matchedPools.push(...(fallbackArtistPool.bass || []));
            });
            const pool = matchedPools.length ? matchedPools : fallbackArtistPool.default;
            const desired = 3 + Math.floor(rng() * 2);
            let picks = pickUnique(pool, desired, rng, context.artists || []);
            if (!picks.length) {
                picks = pickUnique(fallbackArtistPool.default, desired, rng, context.artists || []);
            }
            return picks;
        };
        const artists = ensureDifferentArray(generator, lastArtistsMock);
        lastArtistsMock = artists;
        return { artists };
    }
    const userPrompt = `
CONTEXT:
- Current Prompt: "${context.prompt}"
- Selected Genres: ${context.genres.join(', ') || 'None'}
- Lyrical Theme: "${context.lyrics || 'None'}"

TASK:
Based on the context and your expert knowledge, suggest 3-5 relevant artist influences. Provide a mix of foundational artists and **currently trending, modern artists** (e.g., Fred again.., Anyma, Bicep). The suggestions must be insightful and directly related to the user's input. Return a JSON object with a single key "artists" which is an array of strings.`;
     return callGemini(suggestionSystemInstruction, userPrompt, { type: 'object', properties: { artists: { type: 'array', items: { type: 'string' } } } });
}

export const suggestLanguages = async (context: any) => {
    const API_BASE = typeof window !== 'undefined' ? (import.meta as any).env?.VITE_API_BASE_URL || null : null;
    if (typeof window !== 'undefined' && API_BASE) {
        const resp = await fetch(`${API_BASE.replace(/\/$/, '')}/api/suggest-languages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context }) });
        return resp.json();
    }
    if (!ai) {
        const generator = (attempt: number) => {
            const seed = hashString(`${context.genres?.join(',') || ''}|${context.prompt || ''}|${Date.now()}|${attempt}`);
            const rng = createSeededRng(seed);
            const existing = context.languages || [];
            const languages: string[] = [];
            const genreString = (context.genres || []).join(' ').toLowerCase();
            if (genreString.includes('latin') || /reggaeton|baile|salsa|tropical/.test(context.prompt || '')) {
                languages.push('Spanish', 'Portuguese');
            }
            if (genreString.includes('k-pop') || genreString.includes('korean')) {
                languages.push('Korean');
            }
            if (genreString.includes('j-pop') || /anime|tokyo/.test(context.prompt || '')) {
                languages.push('Japanese');
            }
            if (/bollywood|indian|desi|raag|bhangra/i.test(`${context.prompt} ${context.lyrics}`)) {
                languages.push('Hindi', 'Punjabi', 'Tamil');
            }
            if (/afro|afrobeats|africa|lagos|naija/i.test(`${context.prompt} ${context.genres}`)) {
                languages.push('Yoruba', 'English');
            }
            const pool = Array.from(new Set([...languages, ...fallbackLanguagePool]));
            let picks = pickUnique(pool, 3, rng, existing);
            if (!picks.length) {
                picks = pickUnique(fallbackLanguagePool, 3, rng, existing);
            }
            return picks;
        };
        const languages = ensureDifferentArray(generator, lastLanguagesMock);
        lastLanguagesMock = languages;
        return { languages };
    }
    const userPrompt = `
CONTEXT:
- Current Prompt: "${context.prompt}"
- Selected Genres: ${context.genres.join(', ') || 'None'}
- Artist Inspirations: ${context.artists.join(', ') || 'None'}
- Existing Languages: ${context.languages?.join(', ') || 'None'}
- Lyrics Provided: ${context.lyrics ? 'Yes' : 'No'}

TASK:
Recommend 1-3 vocal languages that best suit the genre, cultural tone, and artist inspirations. Include English if crossover appeal is likely. Return a JSON object with key "languages" containing an array of strings.`;
    return callGemini(suggestionSystemInstruction, userPrompt, { type: 'object', properties: { languages: { type: 'array', items: { type: 'string' } } } });
}

export const enhanceLyrics = async (context: any) => {
    const API_BASE = typeof window !== 'undefined' ? (import.meta as any).env?.VITE_API_BASE_URL || null : null;
   if (typeof window !== 'undefined' && API_BASE) {
       const resp = await fetch(`${API_BASE.replace(/\/$/, '')}/api/enhance-lyrics`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context }) });
       return resp.json();
    }
    if (!ai) {
        const lyrics = ensureDifferentString((attempt) => {
            const themeSource = `${context.prompt || ''} ${context.lyrics || ''}`.trim() || 'electric nights';
            const themeWords = themeSource.split(/\s+/).slice(0, 6).join(' ');
            const seed = hashString(`${themeSource}|${(context.genres || []).join(',')}|${Date.now()}|${attempt}`);
            const rng = createSeededRng(seed);
            const imagery = pickUnique(lyricImagery, 2, rng);
            const motifs = pickUnique(lyricMotifs, 2, rng);
            const payoff = pickUnique(lyricPayoffs, 1, rng)[0];

            const verseLines = [
                `${capitalizePhrase(imagery[0])} over ${themeWords.toLowerCase()}`,
                `${capitalizePhrase(motifs[0])}, signals in the rain`,
            ];

            const chorusLines = [
                `${capitalizePhrase(payoff)}`,
                `${capitalizePhrase(motifs[1])}, we glow beyond the fray`,
            ];

            const bridgeLines = [
                `${capitalizePhrase(imagery[1])} whispers in the dark`,
                `${capitalizePhrase(payoff)}, our legacy of sparks`,
            ];

            return [
                'Verse 1:',
                verseLines.join('\n'),
                '',
                'Chorus:',
                chorusLines.join('\n'),
                '',
                'Bridge:',
                bridgeLines.join('\n'),
            ].join('\n');
        }, lastLyricsMock);
        lastLyricsMock = lyrics;
        return { lyrics };
    }
    const userPrompt = `
CONTEXT:
- Current Prompt: "${context.prompt}"
- Selected Genres: ${context.genres.join(', ') || 'None'}
- Artist Influences: ${context.artists.join(', ') || 'None'}
- Current Lyrics: "${context.lyrics || 'None'}"
- Desired Duration (seconds): ${context.duration}

TASK:
Expand or rewrite the "Current Lyrics" into a more complete lyrical theme suitable for a song of the specified duration. The theme should match the mood of the other context fields. Structure it with clear sections if possible (e.g., Verse 1, Chorus). Return a JSON object with a single key "lyrics".`;
    return callGemini(suggestionSystemInstruction, userPrompt, { type: 'object', properties: { lyrics: { type: 'string' } } });
}


// --- Generation and Audit Functions ---

export async function generateMusicPlan(fullPrompt: any, creativitySeed: number): Promise<MusicPlan> {
    if (!ai) {
        const mockPlan: MusicPlan = {
            title: 'Mock Plan',
            genre: fullPrompt.genres[0] || 'electronic',
            bpm: 122,
            key: 'C Minor',
            overallStructure: 'Intro - Verse - Chorus - Breakdown - Drop - Outro',
            vocalStyle: 'Ethereal female lead with vocoder harmonies',
            lyrics: fullPrompt.lyrics || 'Instrumental focus with atmospheric chants.',
            randomSeed: creativitySeed,
            sections: [
                {
                    name: 'Intro',
                    sectionType: 'intro',
                    durationBars: 8,
                    chordProgression: ['Cm7', 'Abmaj7'],
                    drumPattern: { kick: [1], snare: [0], hihat: [0.5, 1, 1.5] },
                    synthLine: { pattern: 'pads', timbre: 'warm' },
                    leadMelody: [],
                    effects: { reverb: 0.4, compressionThreshold: -12, stereoWidth: 0.6 },
                    lyrics: '',
                },
                {
                    name: 'Verse',
                    sectionType: 'verse',
                    durationBars: 16,
                    chordProgression: ['Cm7', 'Abmaj7', 'Fm7', 'Bb7'],
                    drumPattern: { kick: [1, 1.5], snare: [2], hihat: [0.5, 1, 1.5, 2] },
                    synthLine: { pattern: 'arpeggio-up', timbre: 'glassy' },
                    leadMelody: [
                        { note: 'C5', duration: 0.5, ornamentation: 'light' },
                        { note: 'D5', duration: 0.5, ornamentation: 'light' },
                        { note: 'E5', duration: 0.5, ornamentation: 'light' },
                        { note: 'F5', duration: 0.5, ornamentation: 'light' }
                    ],
                    effects: { reverb: 0.5, compressionThreshold: -10, stereoWidth: 0.85 },
                    lyrics: fullPrompt.lyrics || 'Electronic dreams in the night sky, dancing with the stars above',
                },
                {
                    name: 'Chorus',
                    sectionType: 'chorus',
                    durationBars: 16,
                    chordProgression: ['Abmaj7', 'Fm7', 'Cm7', 'Bb7'],
                    drumPattern: { kick: [1, 1.5], snare: [2], hihat: [0.5, 1, 1.5, 2] },
                    synthLine: { pattern: 'arpeggio-up', timbre: 'glassy' },
                    leadMelody: [
                        { note: 'C5', duration: 0.5, ornamentation: 'light' },
                        { note: 'G5', duration: 0.5, ornamentation: 'heavy' },
                        { note: 'F5', duration: 0.5, ornamentation: 'light' },
                        { note: 'E5', duration: 0.5, ornamentation: 'light' }
                    ],
                    effects: { reverb: 0.5, compressionThreshold: -10, stereoWidth: 0.85 },
                    lyrics: fullPrompt.lyrics || 'We are the future, we are the light, shining bright in the digital age',
                },
                {
                    name: 'Outro',
                    sectionType: 'outro',
                    durationBars: 8,
                    chordProgression: ['Cm7', 'Abmaj7'],
                    drumPattern: { kick: [1], snare: [0], hihat: [0.5, 1, 1.5] },
                    synthLine: { pattern: 'pads', timbre: 'warm' },
                    leadMelody: [{ note: 'C5', duration: 2, ornamentation: 'light' }],
                    effects: { reverb: 0.6, compressionThreshold: -8, stereoWidth: 0.9 },
                    lyrics: '',
                },
            ],
            stems: { vocals: true, drums: true, bass: true, instruments: true },
            cuePoints: { introEnd: 32, dropStart: 64, outroStart: 96 },
        } as unknown as MusicPlan;
        return mockPlan;
    }
    const systemInstruction = `You are MuseForge Pro, an expert AI composer. Your mandate is to generate a unique, detailed, and professional music plan for a combined audio and video production.

EXECUTION MANDATE:
1.  **CRITICAL DIRECTIVE ON UNIQUENESS & DYNAMICS:** Your primary goal is to avoid generic and repetitive musical structures. Failure to do so is a critical error. To achieve this:
    -   **VARY CHORD PROGRESSIONS:** You are STRICTLY PROHIBITED from using the exact same chord progression across all sections of the song (e.g., Intro, Verse, Chorus, etc.). Introduce variations, inversions, or entirely different progressions between sections to create musical interest and development.
    -   **VARY MIXING EFFECTS:** The 'effects' object (reverb, compressionThreshold, stereoWidth) MUST have different values for different section types. For example, a 'drop' section should have a wider stereo field and different reverb settings than a 'verse' to create dynamic contrast. Do not apply static mixing.
    -   **USE THE SEED FOR VARIATION:** The provided "creativitySeed": "${creativitySeed}" MUST be used as the source of randomness for ALL creative decisions, ensuring both uniqueness on each run and the necessary variation between the song's internal sections. You must also embed this seed in the 'randomSeed' field of the final JSON plan.

2.  **LYRICS INTEGRATION:** If lyrics are provided in the user request, they are NOT optional. You MUST incorporate them as a sung vocal melody. To do this, you must first distribute the lyrics into the \`lyrics\` field of appropriate song sections (e.g., verse, chorus). Then, for every section that contains lyrics, you MUST generate a corresponding \`leadMelody\`. The melody's rhythm and phrasing must plausibly match the syllables and cadence of the lyrics to create a "sung" vocal line. Instrumental sections MUST have an empty \`lyrics\` field and an empty \`leadMelody\` array.
3.  **DJ & VIDEO STRUCTURE:** The plan must be suitable for both DJs and video production, featuring DJ-friendly elements like a beat-only 'intro' and 'outro' (8 or 16 bars), clear build-ups, and a 'drop' or 'breakdown'. Calculate and include BPM, Key, and cue points in seconds.
4.  **SCHEMA ADHERENCE:** The output MUST be a single, valid JSON object that strictly adheres to the provided schema. No extra text, explanations, or markdown is permitted.`;

    const userPrompt = `Generate a complete music plan based on the following user request:\n${JSON.stringify(fullPrompt, null, 2)}`;
    return callGemini(systemInstruction, userPrompt, musicPlanSchema);
}


export async function auditMusicPlan(plan: MusicPlan, originalRequest: any) {
    if (!ai) {
        return { lyricsSung: true, isUnique: true, styleFaithful: true, djStructure: true, masteringApplied: true, passed: true, feedback: 'Offline mock audit passed.' };
    }
     const systemInstruction = `You are an AI Quality Assurance agent for MuseForge Pro. Your task is to audit a generated music plan against the user's request and a set of critical quality directives. Be strict and objective. Your feedback will be used as a Root Cause Analysis (RCA) if the plan fails.`;
     const userPrompt = `
Original User Request:
${JSON.stringify(originalRequest, null, 2)}

Generated Music Plan to Audit:
${JSON.stringify(plan, null, 2)}

AUDIT CHECKLIST (provide a boolean and brief feedback for each):
1.  lyricsSung: If lyrics were in the request, are they properly assigned to vocal sections AND is there a corresponding leadMelody for each lyrical part?
2.  isUnique: Does the plan seem generic? Or does it show creative variation in chords, structure, and effects that would make it unique? Was the randomSeed used?
3.  styleFaithful: Does the instrumentation, BPM, and mood in the plan align with the requested genres and artists?
4.  djStructure: Does the plan include DJ-friendly elements like a clear intro/outro and a drop or breakdown?
5.  masteringApplied: Does the plan include specific mixing notes for effects like reverb, compression, and stereo width?

Based on the above, set 'passed' to true only if ALL checks are satisfactory. Provide a final summary in the 'feedback' field, framed as an RCA if it fails.
`;
    return callGemini(systemInstruction, userPrompt, auditSchema);
}


export async function generateCreativeAssets(musicPlan: MusicPlan, videoStyles: VideoStyle[], lyrics: string) {
    if (!ai) {
        return {
            lyricsAlignment: lyrics ? [{ time: '0s-20s', line: lyrics }] : [],
            videoStoryboard: Object.fromEntries(videoStyles.map(style => [style, `Placeholder storyboard for ${style}.`])),
        };
    }
    const systemInstruction = `You are a creative director AI for MuseForge Pro. Based on a detailed music plan, you will generate two key assets: a time-coded lyric alignment and a set of concise video storyboards.`;
    
    const userPrompt = `
Music Plan:
${JSON.stringify(musicPlan, null, 2)}

Requested Video Styles: ${videoStyles.join(', ') || 'None'}
Lyrics Provided: "${lyrics || 'None'}"

TASK:
1.  **Lyrics Alignment:** Analyze the music plan's structure, BPM, and lyrics. Create an array aligning lyric lines to time ranges (in seconds). The time ranges should be logical based on the section durations. If no lyrics were provided, this MUST be an empty array.
2.  **Video Storyboards:** For each requested video style (${videoStyles.join(', ')}), write a single, concise sentence describing the visual concept. The final JSON object should only contain keys for the styles that were requested. If no video styles were requested, this should be an empty object.

Return a single JSON object adhering to the provided schema.
`;
     return callGemini(systemInstruction, userPrompt, creativeAssetsSchema);
}
