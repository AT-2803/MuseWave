# MuseWave Backend

A TypeScript backend for music and video generation using Fastify, Prisma, and ffmpeg.

## Features

- REST API for music/video generation
- Real-time job status via SSE
- In-process job queue with concurrency and retries
- Local or S3 asset storage
- Bearer token authentication with rate limiting
- Prometheus metrics
- SQLite database with Prisma ORM

## Quick Start

Prerequisites:
- Node.js 20+
- ffmpeg installed and available on your PATH (`ffmpeg -version`)

1. Copy the environment template:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up database:
   ```bash
   npm run db:push
   npm run db:seed
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

### Generate Music/Video
```bash
curl -X POST http://localhost:3000/generate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a upbeat electronic track",
    "duration": 30,
    "includeVideo": true
  }'
```

### Get Job Status
```bash
curl http://localhost:3000/jobs/JOB_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Download Asset
```bash
curl http://localhost:3000/assets/ASSET_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Metrics
```bash
curl http://localhost:3000/metrics
```

## Environment Variables

See `.env.example` for all configuration options.

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run test` - Run tests with Vitest
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with test data

## Architecture

- **Server**: Fastify with plugins for CORS, security, rate limiting
- **Database**: SQLite with Prisma ORM
- **Queue**: In-memory queue with worker concurrency
- **Storage**: Local filesystem or S3
- **Audio/Video**: ffmpeg for processing and rendering
- **AI**: Google Gemini for planning and enhancement
