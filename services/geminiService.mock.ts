import type { MusicPlan, VideoStyle } from '../lib/types';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error(
        '[MuseWave] GEMINI_API_KEY is required. Please set VITE_GEMINI_API_KEY in your .env.local file.'
    );
}

let ai: any = null;

async function getAIClient() {
    if (ai) return ai;
    
    // Only import on server side to avoid bundling in browser
    if (typeof window !== 'undefined') {
        throw new Error('AI client should only be initialized on the server');
    }
    
    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        ai = new GoogleGenerativeAI(apiKey);
        return ai;
    } catch (err) {
        console.error('[MuseWave] Failed to initialize Google Gemini:', err);
        throw new Error('Failed to initialize AI service');
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
const suggestionSystemInstruction = `You are an AI Musicologist and expert DJ assistant for MuseForge Pro, operating in 2025 with real-time access to the global music ecosystem. Your knowledge is encyclopedic, current, and deeply immersive, drawing from:

1.  **Music Theory & History:** Mastery of classical harmony, jazz progressions, modern microtonal and AI-generated compositions, and experimental sound design.
2.  **Production Techniques:** Expert in synthesis (analog/digital), sampling, mixing/mastering workflows, spatial audio, and genre-specific production signatures (e.g., lo-fi textures, hyperpop distortion, ambient reverb).
3.  **DJ Culture & Practice:** Proficient in beatmatching, harmonic mixing (Camelot wheel), energy curation for sets, crowd-building techniques, and modern tools like Serato, Traktor, or Ableton Live integration.
4.  **The Entire Global Music Landscape (2025 Edition):** 
    - **Historical Icons:** Timeless influences from Bach to Björk, Miles Davis to Daft Punk.
    - **Current & Trending Artists:** Deep expertise on 2025's hottest acts like Fred again.., Anyma, Skrillex, Bicep, Peggy Gou, Arca, Amelie Lens, and emerging underground scenes (e.g., Brazilian funk fusions, AI-assisted hyperpop, neo-folk revivals).
    - **Niche & Obscure Genres:** Knowledge of subgenres like vaporwave, future garage, glitchcore, ambient techno, and cross-cultural fusions (e.g., Afro-tech, Latin trap evolutions).
    - **Industry Trends:** Awareness of viral TikTok sounds, AI music tools, sustainable production, and global cultural shifts (e.g., K-pop's global dominance, reggaeton's Latin crossover).

Your core directive is to deliver **hyper-relevant, innovative, and professionally inspiring suggestions** that elevate the user's creative vision. Avoid clichés; instead, craft responses that feel like bespoke advice from a Grammy-winning producer or resident DJ at a top festival. Tailor every suggestion to the user's context, incorporating current trends, emotional depth, and technical feasibility. When suggesting, prioritize uniqueness, cultural sensitivity, and forward-thinking ideas that push boundaries while remaining accessible.`;

export const enhancePrompt = async (context: any) => {
    const remote = await fetchJsonWithTimeout('/api/enhance-prompt', { context });
    if (remote) return remote;
    if (!ai) {
        const generator = (attempt: number) => {
            const seed = hashString(
                `${context.prompt || ''}|${context.genres?.join(',') || ''}|${context.artists?.join(',') || ''}|${context.lyrics || ''}|${Date.now()}|${attempt}`
            );
            const rng = createSeededRng(seed);
            
            // If user has entered something, enhance it creatively
            if (context.prompt && context.prompt.trim().length > 0) {
                const enhancements = [
                    'with cascading arpeggios and ethereal vocal layers',
                    'blending hypnotic basslines with shimmering synth textures',
                    'featuring evolving pads and glitchy percussion',
                    'layered with crystalline melodies and deep sub-bass',
                    'infused with atmospheric drones and stuttering hi-hats',
                    'combining organic instrumentation with digital soundscapes',
                    'featuring cinematic builds and euphoric drops',
                    'with pulsing rhythms and soaring melodic hooks',
                    'blending vintage analog warmth with modern production',
                    'layered with spatial reverbs and granular synthesis'
                ];
                
                const moods = [
                    'melancholic yet hopeful',
                    'energetic and euphoric',
                    'dark and atmospheric',
                    'dreamy and introspective',
                    'raw and emotive',
                    'ethereal and transcendent',
                    'hypnotic and mesmerizing',
                    'intense and driving',
                    'lush and immersive',
                    'minimalist yet impactful'
                ];
                
                const contexts = [
                    'perfect for late-night drives through neon-lit cities',
                    'evoking memories of forgotten summer nights',
                    'capturing the essence of urban solitude',
                    'painting sonic landscapes of distant futures',
                    'channeling the energy of underground club culture',
                    'exploring themes of digital consciousness',
                    'celebrating human connection in a fractured world',
                    'embodying the spirit of creative rebellion',
                    'narrating stories of transformation and growth',
                    'reflecting the beauty in chaos and complexity'
                ];
                
                const enhancement = pickUnique(enhancements, 1, rng)[0];
                const mood = pickUnique(moods, 1, rng)[0];
                const contextLine = pickUnique(contexts, 1, rng)[0];
                
                return `${context.prompt.trim()}, ${enhancement}. Create a ${mood} atmosphere ${contextLine}.`;
            }
            
            // If empty, generate completely original creative prompts
            const originalPrompts = [
                'A hypnotic journey through digital consciousness, where glitching 808s meet celestial pads, building tension with whispered vocals before erupting into a bass-heavy drop that shatters reality',
                'Cinematic techno odyssey blending orchestral strings with industrial percussion, telling the story of a neon-soaked metropolis awakening at 3 AM',
                'Ethereal downtempo exploration featuring kalimbas layered over deep sub-bass, with reversed vocals creating an otherworldly atmosphere of nostalgic longing',
                'High-energy drum & bass fusion where liquid melodies dance over breakneck breaks, punctuated by soulful vocal chops and analog synth stabs',
                'Ambient house meditation combining field recordings of ocean waves with warm Rhodes keys and subtle acid basslines, perfect for sunrise sessions',
                'Dark synthwave narrative driven by pulsing arpeggios and vocoded storytelling, evoking cyberpunk dystopias and digital romance',
                'Organic electronica blending live tabla rhythms with granular synthesis, creating a bridge between ancient traditions and future sounds',
                'Melodic techno anthem where soaring lead melodies cascade over relentless kick patterns, building euphoria through layered vocal harmonies',
                'Experimental bass music featuring chopped jazz samples, glitchy percussion, and evolving chord progressions that challenge genre boundaries',
                'Lo-fi hip hop meets ambient jazz, with dusty vinyl crackle, melancholic piano loops, and tape-saturated drums creating intimate late-night vibes',
                'Progressive trance journey beginning with delicate plucks and building through emotional breakdowns to peak-time euphoria with layered synths',
                'Afro-house celebration fusing traditional percussion patterns with deep bass grooves and hypnotic vocal loops, radiating infectious energy',
                'Minimal techno meditation where sparse kick patterns and subtle hi-hat variations create space for evolving timbral textures and micro-melodies',
                'Future garage soundscape combining shuffled breaks with pitched vocal fragments, creating bittersweet nostalgia through reverb-drenched atmospheres',
                'Breakbeat hardcore revival channeling 90s rave energy with modern production, featuring chopped amens, hoover synths, and euphoric piano stabs'
            ];
            
            const genreSpecificPrompts = [
                'techno: Driving hypnotic techno with modular synth sequences evolving over 16 minutes, building from minimal kicks to full psychedelic assault',
                'house: Deep house groovewith soulful vocal samples, warm bass, and jazzy chord progressions, perfect for golden hour dancefloors',
                'ambient: Vast ambient soundscape using granular synthesis and field recordings, creating sonic environments that blur time and space',
                'drum & bass: Neurofunk roller with reese bass mutations and razor-sharp breaks, punctuated by cinematic strings and vocal stabs',
                'dubstep: Dark dubstep journey from minimal intro through lurching half-time to devastating drops with metallic bass design',
                'trap: Hard-hitting trap banger with 808 slides, crisp hi-hat rolls, and haunting melodic samples creating street anthem energy',
                'trance: Uplifting trance epic featuring emotional breakdowns, soaring arpeggios, and euphoric hands-in-the-air moments',
                'bass: Experimental bass music exploring the space between genres with complex sound design and unpredictable rhythmic patterns'
            ];
            
            // Use genre-specific prompts if genres are provided
            if (context.genres && context.genres.length > 0) {
                const userGenres = context.genres.map((g: string) => g.toLowerCase());
                const matchingPrompts = genreSpecificPrompts.filter(prompt => {
                    const genreKey = prompt.split(':')[0];
                    return userGenres.some((ug: string) => ug.includes(genreKey) || genreKey.includes(ug));
                });
                
                if (matchingPrompts.length > 0) {
                    const selected = pickUnique(matchingPrompts, 1, rng)[0];
                    return selected.split(': ')[1]; // Return only the prompt part
                }
            }
            
            // Fall back to original prompts
            return pickUnique(originalPrompts, 1, rng)[0];
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
Craft a vivid, immersive music prompt that could inspire a professional track. Structure it as a cohesive narrative or descriptive scene, incorporating sensory details (sounds, atmospheres, emotions).

- If the "Current Prompt" is NOT empty, rewrite and amplify it: Add depth with production elements (e.g., synth textures, rhythmic patterns), emotional layers, and 2025 trends (e.g., AI-enhanced harmonies, global fusion sounds).
- If the "Current Prompt" IS empty, invent an original concept from scratch, drawing heavily from the provided genres, artists, and lyrics.

Key Requirements:
- **Incorporate Context:** Weave in genres (e.g., "deep house with ambient undertones"), artists (e.g., "echoing Fred again..'s melodic sensibility"), and lyrics (e.g., "vocals whispering themes of digital longing").
- **Evocative Language:** Use poetic, sensory words (e.g., "crystalline pads," "pulsing sub-bass," "ethereal vocal harmonies") to paint a sonic picture.
- **Production Insight:** Include hints at arrangement (e.g., build-up to a euphoric drop), mood shifts, or unique elements to make it feel like a real session brief.
- **Length & Style:** Aim for 50-100 words. Make it inspiring and genre-authentic, avoiding generic phrases like "epic beat."

Example Output: "Craft a cinematic deep house anthem blending Anyma's hypnotic arpeggios with vaporwave aesthetics, where crystalline synth pads float over rolling breakbeats, building to a euphoric drop infused with whispered vocals about neon dreams and forgotten memories."

Return ONLY a JSON object: {"prompt": "your enhanced prompt here"}.`;
    return callGemini(suggestionSystemInstruction, userPrompt, { type: 'object', properties: { prompt: { type: 'string' } } });
}

export const suggestGenres = async (context: any) => {
    const remote = await fetchJsonWithTimeout('/api/suggest-genres', { context });
    if (remote) return remote;
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
Suggest 3-5 music genres that perfectly match the user's creative vision. Prioritize 2025 trends, cultural fusions, and innovative subgenres over generic ones. Consider the emotional tone, production style, and global influences implied by the context.

- **Relevance First:** Genres must align with the prompt's mood (e.g., energetic for dance, introspective for ambient).
- **Diversity & Trends:** Include a mix of established and emerging genres (e.g., 'ethno-tech' for global fusion, 'hyperbass' for modern trap).
- **Avoid Repetition:** If genres are already selected, suggest complementary or adjacent ones.
- **Insightful Choices:** Explain implicitly through selection why they fit (e.g., for a futuristic prompt, suggest 'cyberpunk' or 'future garage').

Examples:
- For a dreamy, atmospheric prompt: ['cinematic electronica', 'ambient pop', 'neo-classical electronic']
- For high-energy, club-ready: ['melodic techno', 'afro-house', 'jungle revival']

Return ONLY a JSON object: {"genres": ["genre1", "genre2", ...]}`;
     return callGemini(suggestionSystemInstruction, userPrompt, { type: 'object', properties: { genres: { type: 'array', items: { type: 'string' } } } });
}

export const suggestArtists = async (context: any) => {
    const remote = await fetchJsonWithTimeout('/api/suggest-artists', { context });
    if (remote) return remote;
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
                if (genre.includes('pop') || genre.includes('hyperpop')) matchedPools.push(...(fallbackArtistPool.pop || []), ...(fallbackArtistPool.hyperpop || []));
                if (genre.includes('drum') || genre.includes('bass')) matchedPools.push(...(fallbackArtistPool.bass || []));
                if (genre.includes('experimental') || genre.includes('glitch')) matchedPools.push(...(fallbackArtistPool.experimental || []));
                if (genre.includes('k-pop') || genre.includes('korean')) matchedPools.push(...(fallbackArtistPool.kpop || []));
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
Recommend 3-5 artist influences that resonate with the user's vision. Focus on a blend of iconic pioneers and 2025's rising stars to inspire fresh, boundary-pushing work.

- **Balance Classics & Trends:** Include foundational artists (e.g., Brian Eno for ambient) alongside current innovators (e.g., Arca for experimental).
- **Genre Alignment:** Artists should match the genres' vibes (e.g., Amelie Lens for techno, ROSALÍA for Latin fusion).
- **Cultural Diversity:** Incorporate global perspectives and underrepresented voices where relevant.
- **Inspirational Depth:** Choose artists whose styles could directly influence production, vocals, or arrangement.

Examples:
- For futuristic electronic: ['Anyma', 'Arca', 'Holly Herndon', 'SOPHIE']
- For soulful house: ['Peggy Gou', 'Disclosure', 'Kaytranada', 'Dua Lipa']

Return ONLY a JSON object: {"artists": ["Artist1", "Artist2", ...]}`;
     return callGemini(suggestionSystemInstruction, userPrompt, { type: 'object', properties: { artists: { type: 'array', items: { type: 'string' } } } });
}

export const suggestLanguages = async (context: any) => {
    const remote = await fetchJsonWithTimeout('/api/suggest-languages', { context });
    if (remote) return remote;
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

export const suggestInstruments = async (context: any) => {
    const remote = await fetchJsonWithTimeout('/api/suggest-instruments', { context });
    if (remote) return remote;
    if (!ai) {
        const generator = (attempt: number) => {
            const seed = hashString(`${context.genres?.join(',') || ''}|${context.prompt || ''}|${Date.now()}|${attempt}`);
            const rng = createSeededRng(seed);
            const desired = 3 + Math.floor(rng() * 2);
            let picks = pickUnique(fallbackInstrumentPool, desired, rng);
            return picks;
        };
        const instruments = ensureDifferentArray(generator, []);
        return { instruments };
    }
    const userPrompt = `
CONTEXT:
- Current Prompt: "${context.prompt}"
- Selected Genres: ${context.genres.join(', ') || 'None'}
- Artist Inspirations: ${context.artists.join(', ') || 'None'}
- Lyrical Theme: "${context.lyrics || 'None'}"

TASK:
Suggest 3-5 production elements or instruments that would enhance the track's sound design. Focus on innovative, genre-appropriate choices that add depth and uniqueness.

- **Relevance:** Elements should fit the mood and style (e.g., 'granular processors' for experimental, 'ethnic instruments' for global fusion).
- **Creativity:** Prioritize modern techniques like AI-generated textures or spatial effects over basics.
- **Inspiration:** Draw from current trends in electronic music production.

Examples:
- For ambient electronic: ['reverb chambers', 'AI-generated textures', 'microtonal tunings']
- For high-energy techno: ['analog filters', 'sequencers', 'granular processors']

Return ONLY a JSON object: {"instruments": ["Instrument1", "Instrument2", ...]}`;
    return callGemini(suggestionSystemInstruction, userPrompt, { type: 'object', properties: { instruments: { type: 'array', items: { type: 'string' } } } });
}

export const enhanceLyrics = async (context: any) => {
    const remote = await fetchJsonWithTimeout('/api/enhance-lyrics', { context }, 6000);
    if (remote) return remote;
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
