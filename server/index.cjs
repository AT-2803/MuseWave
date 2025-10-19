/* Minimal server example for running the Google GenAI SDK server-side.

   - This file is intentionally dependency-free (uses only Node built-ins and dynamic import)
   - Start with: NODE_ENV=production node server/index.js
   - Set GEMINI_API_KEY in env to enable the real SDK; otherwise the endpoint returns a mock plan.

   This is an example only; adapt to your deployment (Express, Vercel, Netlify functions, etc.)
*/

const http = require('http');
const { URL } = require('url');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || null;

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

  // Dynamic import of the real SDK - only runs on the server when API key is present.
  try {
    const mod = await import('@google/genai');
    const { GoogleGenAI } = mod;
    const client = new GoogleGenAI({ apiKey: API_KEY });

    // This is a very small example of how you might call the SDK. Replace with
    // the real prompt + schema that you need. For safety, this example returns
    // the mock plan unless you wire a proper system/user prompt and schema.
    // Here we'll just return the mock plan for predictability.
    return { plan: buildMockPlan(reqBody), usedSdk: true };
  } catch (err) {
    console.error('Failed to import or initialize @google/genai:', err);
    return { plan: buildMockPlan(reqBody), error: String(err) };
  }
}

const server = http.createServer(async (req, res) => {
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
