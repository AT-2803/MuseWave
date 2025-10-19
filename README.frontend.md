<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1kMZ30k-W6zUog4zKeV86ZgVeqFKMkpPz

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploying

Vercel (recommended):

- One-click: Import the repository into Vercel and set the build command to `npm run build` and output directory to `dist`.
- Alternatively, add the provided `vercel.json` (already included) which tells Vercel to use `@vercel/static-build` and serve `dist/`.

GitHub Pages:

- A GitHub Actions workflow (`.github/workflows/deploy-gh-pages.yml`) is included which builds and deploys to the `gh-pages` branch on push to `main`.
