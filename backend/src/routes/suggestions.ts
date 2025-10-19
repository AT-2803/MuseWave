import { Router } from 'express';
import { enhancePrompt, suggestGenres, suggestArtists, suggestLanguages, enhanceLyrics } from '../services/geminiService';

const router = Router();

router.post('/enhance-prompt', async (req, res) => {
  try {
    const result = await enhancePrompt(req.body.context);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/suggest-genres', async (req, res) => {
  try {
    const result = await suggestGenres(req.body.prompt);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/suggest-artists', async (req, res) => {
  try {
    const result = await suggestArtists(req.body.prompt);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/suggest-languages', async (req, res) => {
  try {
    const result = await suggestLanguages(req.body.prompt);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/enhance-lyrics', async (req, res) => {
  try {
    const result = await enhanceLyrics(req.body.lyrics);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export { router as suggestionRouter };