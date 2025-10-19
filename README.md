# MuseWave Backend

A Fastify + TypeScript backend that generates fully synthetic music audio and video assets with FFmpeg-based DSP chains. The stack uses Prisma with SQLite, an in-process job queue, and exposes a headless JSON API for orchestrating end-to-end music production workflows.

## Prerequisites

- Node.js 20+
- `ffmpeg` and `ffprobe` available on `PATH`

## Quickstart

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

The development server listens on the port specified in `.env` (default `8080`).

## API Overview

All requests except `/health` and `/metrics` require the header `Authorization: Bearer <API_KEY>`. During development the database seed inserts `dev-key-123`.

- `GET /health`
- `GET /metrics`
- `POST /v1/generate`
- `GET /v1/jobs/:id`
- `GET /v1/assets/:id`
- `GET /v1/assets/:id/meta`

### Example Pipeline

```bash
# Kick off a 16 second techno track with video
curl -X POST http://localhost:8080/v1/generate \
  -H 'Authorization: Bearer dev-key-123' \
  -H 'Content-Type: application/json' \
  -d '{
    "musicPrompt": "Driving warehouse techno groove",
    "genres": ["techno"],
    "duration": 16,
    "artistInspiration": ["Charlotte de Witte"],
    "lyrics": "Feel the night ignite our minds",
    "vocalLanguages": ["en"],
    "generateVideo": true,
    "videoStyles": ["Abstract Visualizer", "Lyric Video"]
  }'
```

The response immediately returns `{ "jobId": "..." }`. Poll `/v1/jobs/:id` to inspect pipeline progress. When stages finish they emit assets that can be streamed from `/v1/assets/:id`.

## Project Structure

```
prisma/            # Database schema and seed
src/
  index.ts        # Entrypoint
  server.ts       # Fastify bootstrap
  auth/           # API key auth + rate limiting
  plugins/        # Prisma, storage, ffmpeg utilities, security headers
  services/       # Business logic for planning, audio, vocals, mix, video, usage tracking
  providers/      # Audio/video render providers (mock + external stubs)
  queue/          # In-process work queue and job workers
  routes/         # HTTP handlers
  lib/            # Shared helpers (ULID + captions)
  assets/         # Generated asset staging
```

## Testing

```bash
npm test
```

The Vitest suite provisions an isolated database, exercises the health endpoint, validates rate limiting, and runs an end-to-end pipeline over a short clip, asserting that audio/video assets are emitted and persisted.

## Notes

- Local storage writes to `./assets`. Set `USE_S3=true` and provide S3 credentials to upload artifacts to object storage instead.
- The internal queue persists job state in SQLite and enforces exponential backoff with retry caps per stage.
- FFmpeg filter graphs are constructed dynamically to match the musical plan, ensuring harmonically aware basslines, chord stacks, leads, robotic vocals, and multi-style video renders.
