# MuseWave Backend

Production-ready music audio & video generation backend with AI planning, n-gram melody model, and ffmpeg DSP synthesis.

## Stack
- TypeScript (ES2022+)
- Vercel serverless functions
- Neon Postgres
- ffmpeg (CLI or wasm fallback)
- Tiny n-gram model for melody sequencing
- Optional Gemini AI for planning

## Environment Variables
Set in Vercel or `.env`:
- `DATABASE_URL`: Neon Postgres connection string
- `DEFAULT_API_KEY`: Bootstrap API key for seeding
- `RATE_LIMIT_PER_MIN`: Default rate limit (default 60)
- `PROFANITY_DENYLIST`: Comma-separated words to deny in lyrics
- `GEMINI_API_KEY`: Optional for AI planning
- `PUBLIC_BASE_URL`: Base URL for assets (e.g., https://yourdomain.com)

## Setup
1. Clone and install: `npm install`
2. Run migrations: Execute the SQL in `migrations/001_initial.sql` on your Neon database.
3. Seed API key: POST to `/api/keys/seed` with admin auth (local only).
4. Deploy to Vercel.

## API Endpoints
- `GET /api/health` - Health check with metrics
- `GET /api/metrics` - Prometheus metrics
- `POST /api/keys/seed` - Seed default API key (admin)
- `POST /api/model/seed` - Seed n-gram model (admin)
- `POST /api/generate/pipeline` - Generate music (body: {prompt, duration, genre})
- `GET /api/jobs/[id]` - Get job status
- `GET /api/assets/[id]` - Download asset

All POSTs require `Authorization: Bearer <API_KEY>` except health/metrics.

## Notes
- Uses ffmpeg CLI if available, else ffmpeg.wasm.
- Assets stored in `/public/assets` with deterministic paths.
- Jobs are idempotent via params hash.
- Metrics at `/api/metrics` in Prometheus format.