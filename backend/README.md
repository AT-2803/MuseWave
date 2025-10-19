# MuseWave Backend (In Progress)

This directory contains the new service stack for MuseWave. The implementation is progressing in stages.

## Current Capabilities

- Project tooling (TypeScript, Prisma, Vitest) and environment configuration.
- Database schema for jobs, assets, API keys, and rate counters.
- Seed script to create a development API key.
- Queue engine with in-process scheduling, concurrency limits, exponential backoff, and idempotent enqueue calls. Plan and audio workers are implemented, producing structured blueprints and ffmpeg-synthesised stems/preview audio assets.
- HTTP server with auth and rate limiting middleware, health and metrics endpoints, and REST routes for job creation & retrieval.

## Getting Started

Prerequisites:
- Node.js 20+
- ffmpeg installed and available on your PATH (`ffmpeg -version`)

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run migrations:
   ```bash
   npm run migrate
   ```
4. Seed the dev API key (optional):
   ```bash
   npm run seed
   ```
5. Start the service scaffold:
   ```bash
   npm run dev
   ```

## Next Steps

- Add remaining domain-specific workers (`vocals`, `mix`, `video`).
- Integrate optional external providers or more advanced models as they become available.
- Flesh out REST handlers to orchestrate workers and stream generated assets end-to-end.
