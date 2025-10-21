# MuseWave Setup Guide

This guide will help you set up MuseWave with all real integrations (no mocks).

## Prerequisites

1. **Node.js 20.x** or higher
2. **npm** package manager
3. **Google Cloud Account** (for TTS and Gemini AI)
4. **ffmpeg** installed: `brew install ffmpeg` (macOS) or `apt-get install ffmpeg` (Linux)
5. **espeak-ng** installed (optional fallback): `brew install espeak-ng`

## Step 1: Clone and Install

```bash
git clone <your-repo-url>
cd MuseWave3
npm install
```

## Step 2: Get API Keys

### Google Gemini AI API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key

### Google Cloud Text-to-Speech Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Cloud Text-to-Speech API**
4. Create a service account:
   - Navigate to **IAM & Admin > Service Accounts**
   - Click **Create Service Account**
   - Grant it the **Cloud Text-to-Speech User** role
5. Create and download a JSON key for the service account
6. Save the JSON file to a secure location

## Step 3: Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

```env
# REQUIRED
VITE_GEMINI_API_KEY=your_actual_gemini_api_key

# REQUIRED for vocals
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/your/service-account-key.json

# Optional
BACKEND_NEO_URL=http://localhost:3001
MIDI_LIBRARY_PATH=./data/midi
PORT=3000
```

## Step 4: Install Dependencies

### Required Packages

```bash
# Install Google Cloud packages
npm install @google-cloud/text-to-speech @google/generative-ai

# Install MIDI and image processing
npm install midi-file canvas

# Ensure backend-neo has dependencies
cd backend-neo
npm install
cd ..
```

## Step 5: Setup MIDI Library (Optional)

For better Markov model training, create a MIDI library:

```bash
mkdir -p data/midi
```

Add MIDI files to `data/midi/` directory. The system will auto-train from these files.

## Step 6: Run Development Server

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend-Neo (in separate terminal)
cd backend-neo
npm run dev
```

## Step 7: Verify Setup

1. Open http://localhost:5173 (or your Vite port)
2. Test prompt enhancement - should use real Gemini AI
3. Generate a track - should use real TTS and DSP pipeline
4. Check console for any errors

## Troubleshooting

### "GEMINI_API_KEY is required" Error

- Ensure `.env.local` exists and contains `VITE_GEMINI_API_KEY`
- Restart the dev server after adding environment variables

### TTS Fails with "credentials" Error

- Verify `GOOGLE_APPLICATION_CREDENTIALS` points to valid JSON file
- Check file permissions: `chmod 600 /path/to/service-account-key.json`
- Ensure the service account has Text-to-Speech permissions

### FFmpeg Not Found

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Verify installation
ffmpeg -version
```

### Backend Connection Errors

- Ensure backend-neo is running on port 3001
- Check `BACKEND_NEO_URL` in `.env.local`
- Verify no firewall blocking localhost connections

## Production Deployment

For Vercel deployment:

1. Add environment variables in Vercel dashboard:
   - `VITE_GEMINI_API_KEY`
   - `GOOGLE_APPLICATION_CREDENTIALS` (use base64-encoded JSON)

2. Update `vercel.json` with environment variable handling

3. Deploy:
```bash
vercel --prod
```

## API Costs

- **Google Gemini AI**: Free tier includes 15 requests/minute
- **Google Cloud TTS**: $4 per 1 million characters
- Monitor usage in Google Cloud Console

## Need Help?

Check logs in:
- Browser DevTools Console (frontend errors)
- Terminal output (backend errors)
- `console.log` statements in service files

## Security Notes

- **Never commit** `.env.local` or service account JSON files
- Add to `.gitignore`:
  ```
  .env.local
  **/service-account-*.json
  **/*-credentials.json
  ```
