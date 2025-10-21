import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { authenticate } from '../../lib/auth';
import { createJob, updateJob } from '../../lib/jobs';
import { generatePlan } from '../../lib/music/plan'; // Need to create this
import { sample } from '../../lib/model/markov';
import { generateDrums, generateBass, generateLead } from '../../lib/dsp/stems';
import { mixAndMaster } from '../../lib/dsp/mix';
import { saveAsset } from '../../lib/assets';
import { incrementRequests } from '../../lib/metrics';

const schema = z.object({
  prompt: z.string(),
  duration: z.number().min(10).max(300),
  genre: z.string(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const apiKey = await authenticate(req);
    const body = schema.parse(req.body);
    await incrementRequests();
    const job = await createJob('generate', body, apiKey.id);
    // Async processing
    processGeneration(job.id, body);
    res.status(202).json({ jobId: job.id });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: err });
  }
}

async function processGeneration(jobId: string, params: z.infer<typeof schema>) {
  try {
    await updateJob(jobId, { status: 'running' });
    const plan = await generatePlan(params.prompt, params.genre);
    // Generate stems
    const config = { bpm: plan.bpm, key: plan.key, scale: plan.scale, duration: params.duration };
    const drumsPath = `/tmp/drums_${jobId}.wav`;
    const bassPath = `/tmp/bass_${jobId}.wav`;
    const leadPath = `/tmp/lead_${jobId}.wav`;
    await generateDrums(config, drumsPath);
    const bassNotes = sample(plan.model, Math.floor(params.duration / (60 / config.bpm)));
    await generateBass(config, bassNotes.map(t => t.degree), bassPath);
    const leadNotes = sample(plan.model, Math.floor(params.duration / (60 / config.bpm / 2)));
    await generateLead(config, leadNotes.map(t => t.degree), leadPath);
    // Mix
    const mixPath = `/tmp/mix_${jobId}.wav`;
    await mixAndMaster({ inputs: [drumsPath, bassPath, leadPath], volumes: [0.5, 0.7, 0.6], eq: { low: 2, mid: 0, high: -1 }, compression: { threshold: -20, ratio: 4, attack: 0.01, release: 0.1 }, reverb: 0.2 }, mixPath);
    // Save asset
    const data = await readFile(mixPath);
    const asset = await saveAsset('audio', 'audio/wav', data, params.duration);
    await updateJob(jobId, { status: 'succeeded', result: asset.path });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    await updateJob(jobId, { status: 'failed', error: err });
  }
}