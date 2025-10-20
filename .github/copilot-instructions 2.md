This repository is a Vite + React (TSX) single-page app named MuseWave (aka MuseForge Pro). The instructions below are focused and actionable so an AI coding agent can be productive immediately.

Key facts (big picture)
- Frontend-only SPA served by Vite. Entry: `src/main.tsx` -> `src/App.tsx`.
- Main UI pieces live in `components/` and `pages/` (e.g., `HomePage.tsx`, `DashboardPage.tsx`).
- `services/` contains lightweight browser-safe mocks for orchestration (`orchestratorClient.ts`) and an AI adapter (`geminiService.ts`) that uses mock responses when no server API key is available.
- Worker code lives in `workers/` (web-worker TS files) and is designed for client-side audio/video processing.

Why things are structured this way
- The app is designed to run entirely in the browser by default. Heavy or server-only SDKs must not be bundled into the client. To support both modes the repo uses mock orchestrator functions in `services/orchestratorClient.ts` and a gemini adapter that lazily initializes the Google SDK only when an API key is present and the code runs in Node (server environment).

Developer workflows (essential commands)
- Install: `npm install` (repo doesn't require pnpm). 
- Dev server: `npm run dev` (Vite). If ports are occupied, Vite will pick the next free port.
- Production build: `npm run build` then `npm run preview` to serve `dist/` locally.

Project-specific conventions and gotchas
- Two `App.tsx` files exist: one at `src/App.tsx` (used) and another at repo root — prefer `src/*` paths.
- Avoid importing Node-only SDKs at top-level in modules that are bundled for the browser. Example: `@google/genai` must be dynamically imported on the server only. See `services/geminiService.ts` which performs a dynamic import and falls back to mock logic when `process.env.API_KEY` is absent.
- Routes are client-side via React Router. Main routes are defined in `src/App.tsx` (paths `/` and `/dashboard`).
- UI theming uses Tailwind configured in `tailwind.config.js`. CSS entry is `src/index.css` (imports Tailwind directives).
- Local storage is used for job history (`localStorage` keys: `museforge_job_history`). Presume data shape from `lib/types.ts`.

Integration and cross-component patterns
- Orchestrator mock: `services/orchestratorClient.ts` implements `startGeneration`, `subscribeToJob`, and `fetchJobResult`. These provide an SSE-like API (subscribe returns a closeable object). Use these when adding features that need async job progress.
- Gemini AI layer: `services/geminiService.ts` exposes helper functions like `enhancePrompt`, `suggestGenres`, `generateMusicPlan`, `auditMusicPlan`. They return mock data when no API key is configured. When implementing server-side handlers, dynamically initialize the real SDK there and keep the browser bundle free of SDK imports.
- Workers: `workers/*.worker.ts` are pure web-workers and communicate via `postMessage`/`onmessage` patterns. When adding new worker logic, follow existing message shapes and `status` messages (see `procedural.worker.ts`).

Files you will edit most often
- `src/App.tsx` — top-level routes and layout shell.
- `pages/HomePage.tsx` — main user flows: form, job lifecycle, adaptPlan transformation.
- `components/*` — UI widgets. Prefer reusing `components/ui/*` primitives (Button, Slider, etc.).
- `services/*` — add client-safe adapters; for server-side behavior, add a separate module and ensure dynamic import or server-only execution.

Quick examples (copy-paste patterns)
- Start a mock job and subscribe to updates (pattern used in `pages/HomePage.tsx`):
  const resp = await startGeneration(payload);
  const subscription = subscribeToJob(resp.jobId, (event) => { /* update UI state */ }, (err) => { /* handle error */ });
  // later: subscription.close();

- Use the AI helpers with graceful fallback (see `HomePage.handleSuggestion`):
  const result = await geminiService.enhancePrompt(context);
  // result may be a mock object when no API key is present.

Tests, linting and build checks
- There are no tests included. Use `npm run build` to validate TypeScript and bundling errors quickly. Vite will surface missing imports or bundling-time import errors.

If you change server integration
- Add server-only modules under a `server/` or `api/` folder and dynamically import them from client-side code only when calling server endpoints. Do not import server-only SDKs at module top-level inside `services/` that run in the browser.

When in doubt, check these files first
- `src/main.tsx`, `src/App.tsx`, `pages/HomePage.tsx`, `services/orchestratorClient.ts`, `services/geminiService.ts`, `tailwind.config.js`.

If something renders blank
- Open DevTools console and look for exceptions during module evaluation (top-level import errors). A very common cause in this repo is a server SDK accidentally bundled into the client. Confirm that `@google/genai` is not loaded in the browser bundle.

Questions / gaps
- If you need the server-side deployment pattern for Gemini (where to put the API key and how to proxy requests), tell me whether you'll add a Node/Express or serverless endpoint and I can add a secure, minimal server integration pattern.

---
If any part of this is unclear or you'd like me to tailor examples (e.g., add a sample server endpoint for Gemini or a unit test for `orchestratorClient`), tell me which area to expand and I'll iterate.
