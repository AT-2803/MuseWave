/* Minimal server example for running the Google GenAI SDK server-side.

   - This file uses CommonJS so it runs regardless of `type: module` in package.json
   - Start with: NODE_ENV=production node server/index.cjs
   - Set GEMINI_API_KEY in env to enable the real SDK; otherwise the endpoint returns a mock plan.
*/

const http = require('http');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || null;

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

const fallbackArtistPool = {
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
const genreKeywordMap = [
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
let lastGenresMock = [];
let lastArtistsMock = [];
let lastLanguagesMock = [];
let lastLyricsMock = '';

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function createSeededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function pickUnique(pool, count, rng, exclude = []) {
  const normalizedExclude = new Set(exclude.map((value) => value.toLowerCase()));
  const working = pool.filter((item) => !normalizedExclude.has(item.toLowerCase()));
  const result = [];
  const used = new Set();
  while (working.length && result.length < count) {
    const index = Math.floor(rng() * working.length);
    const value = working[index];
    if (used.has(value.toLowerCase())) {
      working.splice(index, 1);
      continue;
    }
    used.add(value.toLowerCase());
    result.push(value);
    working.splice(index, 1);
  }
  return result;
}

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((value, idx) => value === b[idx]);
}

function ensureDifferentString(generate, previous) {
  let attempt = 0;
  let next = generate(attempt);
  while (next === previous && attempt < 3) {
    attempt += 1;
    next = generate(attempt);
  }
  return next;
}

function ensureDifferentArray(generate, previous) {
  let attempt = 0;
  let next = generate(attempt);
  while (arraysEqual(next, previous) && attempt < 3) {
    attempt += 1;
    next = generate(attempt);
  }
  return next;
}

function capitalizePhrase(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildPromptSuggestion(context = {}) {
  const prompt = ensureDifferentString((attempt) => {
    const seed = hashString(
      `${context.prompt || ''}|${(context.genres || []).join(',')}|${(context.artists || []).join(',')}|${context.lyrics || ''}|${Date.now()}|${attempt}`
    );
    const rng = createSeededRng(seed);
    const genres = (context.genres || []).length
      ? (context.genres || []).join(' / ')
      : pickUnique(fallbackGenrePool, 2, rng).join(' / ');
    const artistLine =
      (context.artists || []).length
        ? `Inspired by ${(context.artists || []).join(', ')}`
        : `Channeling ${pickUnique(fallbackArtistPool.default, 2, rng).join(' & ')}`;
    const groove = pickUnique(promptGrooves, 1, rng)[0];
    const setting = pickUnique(promptSettings, 1, rng)[0];
    const textures = pickUnique(promptTextures, 2, rng);
    const lyricalFocus = context.lyrics
      ? `themes about ${(context.lyrics || '').toString().slice(0, 80)}`
      : 'wordless vocal atmospherics';
    return `Forge a ${genres} anthem with a ${groove}, ${artistLine}. Set it within a ${setting}, weaving ${textures[0]} and ${textures[1]} around ${lyricalFocus}.`;
  }, lastPromptMock);
  lastPromptMock = prompt;
  return prompt;
}

function buildGenreSuggestion(context = {}) {
  const genres = ensureDifferentArray((attempt) => {
    const corpus = `${context.prompt || ''} ${context.lyrics || ''} ${(context.artists || []).join(' ') || ''}`;
    const seed = hashString(`${corpus}|${Date.now()}|${attempt}`);
    const rng = createSeededRng(seed);
    const derived = new Set();
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
  }, lastGenresMock);
  lastGenresMock = genres;
  return genres;
}

function buildArtistSuggestion(context = {}) {
  const artists = ensureDifferentArray((attempt) => {
    const seed = hashString(`${(context.genres || []).join(',')}|${context.prompt || ''}|${Date.now()}|${attempt}`);
    const rng = createSeededRng(seed);
    const primaryGenres = (context.genres || []).map((genre) => genre.toLowerCase());
    const matchedPools = [];
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
  }, lastArtistsMock);
  lastArtistsMock = artists;
  return artists;
}

function buildLanguageSuggestion(context = {}) {
  const languages = ensureDifferentArray((attempt) => {
    const seed = hashString(`${(context.genres || []).join(',')}|${context.prompt || ''}|${Date.now()}|${attempt}`);
    const rng = createSeededRng(seed);
    const existing = context.languages || [];
    const collected = [];
    const promptText = `${context.prompt || ''} ${(context.lyrics || '')} ${(context.genres || []).join(' ')}`.toLowerCase();
    if (promptText.match(/latin|reggaeton|baile|salsa|tropical|brazil|rio/)) {
      collected.push('Spanish', 'Portuguese');
    }
    if (promptText.match(/k-pop|korean/)) {
      collected.push('Korean');
    }
    if (promptText.match(/j-pop|anime|tokyo|japanese/)) {
      collected.push('Japanese');
    }
    if (promptText.match(/bollywood|indian|desi|raag|bhangra/)) {
      collected.push('Hindi', 'Punjabi', 'Tamil');
    }
    if (promptText.match(/afro|afrobeats|africa|lagos|naija/)) {
      collected.push('Yoruba', 'English');
    }
    const pool = Array.from(new Set([...collected, ...fallbackLanguagePool]));
    let picks = pickUnique(pool, 3, rng, existing);
    if (!picks.length) {
      picks = pickUnique(fallbackLanguagePool, 3, rng, existing);
    }
    return picks;
  }, lastLanguagesMock);
  lastLanguagesMock = languages;
  return languages;
}

function buildLyricsSuggestion(context = {}) {
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
  return lyrics;
}

function buildMockPlan(req) {
  const prompt = req.musicPrompt || '';
  const genres = req.genres || [];
  const duration = Number(req.duration || 90);
  const lyrics = req.lyrics || '';
  const artists = req.artistInspiration || [];

  const sections = ['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'];
  const chordProgressions = {
    Intro: ['Cm7', 'Abmaj7', 'Fm7', 'G7'],
    Verse: ['Cm7', 'Gm7', 'Abmaj7', 'Fm7'],
    Chorus: ['Abmaj7', 'Fm7', 'Cm7', 'G7'],
    Bridge: ['Fm7', 'Abmaj7', 'Cm7', 'Bb7'],
    Outro: ['Cm7', 'Abmaj7', 'Fm7', 'G7'],
  };

  const lyricLines = (lyrics || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, index) => ({ section: sections[index % sections.length], text: line }));

  return {
    title: prompt ? prompt.slice(0, 48) : `MuseForge Track ${new Date().getFullYear()}`,
    genre: genres[0] || 'Electronic',
    bpm: 118,
    key: 'C minor',
    duration_sec: duration,
    sections,
    bars_per_section: 8,
    chord_progressions: chordProgressions,
    lyrics_lines: lyricLines,
    artist_style_notes: artists,
  };
}

async function handleGenerate(reqBody) {
  if (!API_KEY) {
    return { plan: buildMockPlan(reqBody), mock: true };
  }

  try {
    // dynamic import of SDK in CommonJS using `await import()` via a new Function wrapper
    // NOTE: this requires Node >= 14 with dynamic import support; we use it here to avoid
    // bundling the SDK in client code and to show a minimal server pattern.
    const mod = await import('@google/genai');
    const { GoogleGenAI } = mod;
    const client = new GoogleGenAI({ apiKey: API_KEY });

    // For predictability in this example, return the mock plan. Replace with real calls as needed.
    return { plan: buildMockPlan(reqBody), usedSdk: true };
  } catch (err) {
    console.error('Failed to import or initialize @google/genai:', err);
    return { plan: buildMockPlan(reqBody), error: String(err) };
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }

  if (url.pathname === '/api/generate-music-plan' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const result = await handleGenerate(payload);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }

  // Suggestion helpers (mock implementations)
  if (url.pathname === '/api/enhance-prompt' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const prompt = buildPromptSuggestion(payload.context || {});
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ prompt }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }

  if (url.pathname === '/api/suggest-genres' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const genres = buildGenreSuggestion(payload.context || {});
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ genres }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }

  if (url.pathname === '/api/suggest-artists' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const artists = buildArtistSuggestion(payload.context || {});
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ artists }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }

  if (url.pathname === '/api/suggest-languages' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const languages = buildLanguageSuggestion(payload.context || {});
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ languages }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }

  if (url.pathname === '/api/enhance-lyrics' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const lyrics = buildLyricsSuggestion(payload.context || {});
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ lyrics }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }

  if (url.pathname === '/api/audit-music-plan' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ lyricsSung: true, isUnique: true, styleFaithful: true, djStructure: true, masteringApplied: true, passed: true, feedback: 'Mock audit passed.' }));
    });
    return;
  }

  // health
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, sdkAvailable: !!API_KEY }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.info(`MuseWave example server listening on http://localhost:${PORT} (GEMINI_API_KEY present: ${!!API_KEY})`);
});
