import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { createJob, updateJob } from '../../lib/jobs';
import { generatePlan } from '../../lib/music/plan';
import { sample } from '../../lib/model/markov';
import { generateDrums, generateBass, generateLead } from '../../lib/dsp/stems';
import { mixAndMaster } from '../../lib/dsp/mix';
import { generateVocals } from '../../lib/dsp/vocals';
import { renderVideo } from '../../lib/dsp/video';
import { saveAsset } from '../../lib/assets';
import { incrementRequests } from '../../lib/metrics';

const schema = z.object({
  musicPrompt: z.string().min(1),
  genres: z.array(z.string()).min(1).default(['techno']),
  duration: z.number().min(30).max(600).default(90),
  artistInspiration: z.array(z.string()).optional(),
  lyrics: z.string().optional(),
  languages: z.array(z.string()).optional(),
  generateVideo: z.boolean().default(false),
  videoStyles: z.array(z.string()).optional(),
  seed: z.number().optional()
});

export type GenerateInput = z.infer<typeof schema>;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const body = schema.parse(req.body);
    
    // Auto-select video style based on lyrics
    if (body.generateVideo && !body.videoStyles) {
      body.videoStyles = body.lyrics ? ['Lyric Video'] : ['Abstract Visualizer'];
    }
    
    await incrementRequests();
    const job = await createJob('generate', body);
    
    // Async processing
    processGeneration(job.id, body).catch(err => {
      console.error('Generation failed:', err);
    });
    
    res.status(202).json({ jobId: job.id, message: 'Generation started' });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    console.error('Pipeline error:', err);
    res.status(400).json({ error: err });
  }
}

async function processGeneration(jobId: string, params: GenerateInput) {
  try {
    await updateJob(jobId, { status: 'running' });
    
    // 1. PLAN: Generate music plan based on genres and prompt
    const plan = await generatePlan(params.musicPrompt, params.genres);
    
    // 2. STEMS: Generate individual instrument stems
    const config = { 
      bpm: plan.bpm, 
      key: plan.key, 
      scale: plan.scale, 
      duration: params.duration,
      swing: plan.swing,
      energy: plan.energy
    };
    
    const drumsPath = `/tmp/drums_${jobId}.wav`;
    const bassPath = `/tmp/bass_${jobId}.wav`;
    const leadPath = `/tmp/lead_${jobId}.wav`;
    
    // Generate drum pattern
    await generateDrums({
      ...config,
      kickPattern: plan.drumPattern.kick,
      snarePattern: plan.drumPattern.snare,
      hatsPattern: plan.drumPattern.hats
    }, drumsPath);
    
    // Generate bass line from model
    const bassNoteCount = Math.floor(params.duration / (60 / config.bpm));
    const bassNotes = sample(plan.model, bassNoteCount);
    await generateBass(config, bassNotes.map(t => t.degree), bassPath);
    
    // Generate lead melody
    const leadNoteCount = Math.floor(params.duration / (60 / config.bpm / 2));
    const leadNotes = sample(plan.model, leadNoteCount);
    await generateLead(config, leadNotes.map(t => t.degree), leadPath);
    
    // 3. VOCALS (optional)
    let vocalsPath: string | undefined;
    if (params.lyrics) {
      vocalsPath = `/tmp/vocals_${jobId}.wav`;
      await generateVocals({
        text: params.lyrics,
        pitch: 0,
        speed: 1.0,
        robot: false,
        language: params.languages?.[0] || 'en'
      }, vocalsPath);
    }
    
    // 4. MIX: Combine all stems with mastering
    const mixPath = `/tmp/mix_${jobId}.wav`;
    const inputs = [drumsPath, bassPath, leadPath];
    const volumes = [0.6, 0.7, 0.5];
    
    if (vocalsPath) {
      inputs.push(vocalsPath);
      volumes.push(0.8);
    }
    
    await mixAndMaster({
      inputs,
      volumes,
      eq: { 
        low: plan.energy > 0.7 ? 3 : 2, 
        mid: 0, 
        high: plan.energy > 0.5 ? -1 : -2 
      },
      compression: { 
        threshold: -20, 
        ratio: 4, 
        attack: 0.01, 
        release: 0.1 
      },
      reverb: plan.reverb
    }, mixPath);
    
    // Save audio asset
    const audioData = await readFile(mixPath);
    const audioAsset = await saveAsset('audio', 'audio/wav', audioData, params.duration);
    
    // 5. VIDEO (optional)
    let videoAsset;
    if (params.generateVideo) {
      const videoPath = `/tmp/video_${jobId}.mp4`;
      const videoStyle = params.videoStyles?.[0] || 'Abstract Visualizer';
      
      // Generate appropriate image for video background
      const imagePath = `/tmp/bg_${jobId}.png`;
      // TODO: Generate or fetch background image
      
      await renderVideo({
        audio: mixPath,
        image: imagePath,
        duration: params.duration,
        resolution: { width: 1920, height: 1080 },
        fps: 30,
        effects: videoStyle === 'Abstract Visualizer' 
          ? ['fade', 'zoompan'] 
          : []
      }, videoPath);
      
      const videoData = await readFile(videoPath);
      videoAsset = await saveAsset('video', 'video/mp4', videoData, params.duration);
    }
    
    // Update job with results
    await updateJob(jobId, { 
      status: 'succeeded', 
      result: {
        audio: audioAsset.path,
        video: videoAsset?.path,
        plan: {
          bpm: plan.bpm,
          key: plan.key,
          scale: plan.scale,
          genres: params.genres,
          structure: plan.structure
        }
      }
    });
    
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    console.error('Process generation error:', err);
    await updateJob(jobId, { status: 'failed', error: err });
    throw error;
  }
}