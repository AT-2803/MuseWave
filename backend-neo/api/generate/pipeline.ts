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
    // Creative status messages
    const messages = [
      'Consulting the AI muse...',
      'Forging sonic blueprints...',
      'Channeling creative frequencies...',
      'Sculpting the soundscape...',
      'Weaving musical DNA...',
      'Summoning harmonic spirits...',
      'Crafting auditory magic...',
      'Brewing sonic potions...'
    ];
    
    await updateJob(jobId, { 
      status: 'running',
      progress: 5,
      message: messages[Math.floor(Math.random() * messages.length)]
    });
    
    // 1. PLAN: Generate music plan based on genres and prompt
    await updateJob(jobId, { 
      progress: 15,
      message: 'Contacting AI composer for master plan...'
    });
    const plan = await generatePlan(params.musicPrompt, params.genres);
    
    await updateJob(jobId, { 
      progress: 25,
      message: '🎼 Blueprint received! Summoning the rhythm section...'
    });
    
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
    await updateJob(jobId, { 
      progress: 35,
      message: '🥁 Forging drum patterns with precision...'
    });
    await generateDrums({
      ...config,
      kickPattern: plan.drumPattern.kick,
      snarePattern: plan.drumPattern.snare,
      hatsPattern: plan.drumPattern.hats
    }, drumsPath);
    
    // Generate bass line from model
    await updateJob(jobId, { 
      progress: 45,
      message: '🎸 Laying down earth-shaking basslines...'
    });
    const bassNoteCount = Math.floor(params.duration / (60 / config.bpm));
    const bassNotes = sample(plan.model, bassNoteCount);
    await generateBass(config, bassNotes.map(t => t.degree), bassPath);
    
    // Generate lead melody
    await updateJob(jobId, { 
      progress: 55,
      message: '🎹 Painting melodic masterpieces...'
    });
    const leadNoteCount = Math.floor(params.duration / (60 / config.bpm / 2));
    const leadNotes = sample(plan.model, leadNoteCount);
    await generateLead(config, leadNotes.map(t => t.degree), leadPath);
    
    // 3. VOCALS (optional)
    let vocalsPath: string | undefined;
    if (params.lyrics) {
      await updateJob(jobId, { 
        progress: 65,
        message: '🎤 Channeling vocal spirits into the mix...'
      });
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
    await updateJob(jobId, { 
      progress: 75,
      message: '🎚️ Mixing and mastering with pro-studio magic...'
    });
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
    
    await updateJob(jobId, { 
      progress: 85,
      message: '💾 Crystallizing your sonic creation...'
    });
    
    // Save audio asset
    const audioData = await readFile(mixPath);
    const audioAsset = await saveAsset('audio', 'audio/wav', audioData, params.duration);
    
    // 5. VIDEO (optional)
    let videoAsset;
    if (params.generateVideo) {
      await updateJob(jobId, { 
        progress: 90,
        message: '🎬 Rendering mesmerizing visuals...'
      });
      const videoPath = `/tmp/video_${jobId}.mp4`;
      const imagePath = `/tmp/image_${jobId}.png`;
      const videoStyle = params.videoStyles?.[0] || 'Abstract Visualizer';
      
      // Generate background image using canvas rendering
      try {
        const { createCanvas } = await import('@napi-rs/canvas');
        const canvas = createCanvas(1920, 1080);
        const ctx = canvas.getContext('2d');
        
        // Create gradient background based on video style
        const gradient = ctx.createLinearGradient(0, 0, 1920, 1080);
        if (videoStyle.toLowerCase().includes('abstract')) {
          gradient.addColorStop(0, '#6366f1');
          gradient.addColorStop(0.5, '#8b5cf6');
          gradient.addColorStop(1, '#d946ef');
        } else if (videoStyle.toLowerCase().includes('lyric')) {
          gradient.addColorStop(0, '#0f172a');
          gradient.addColorStop(0.5, '#1e293b');
          gradient.addColorStop(1, '#334155');
        } else {
          gradient.addColorStop(0, '#0ea5e9');
          gradient.addColorStop(0.5, '#06b6d4');
          gradient.addColorStop(1, '#14b8a6');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1920, 1080);
        
        // Add title overlay
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(params.musicPrompt.substring(0, 40), 960, 540);
        
        // Save to file
        const { writeFile } = await import('fs/promises');
        const buffer = await canvas.encode('png');
        await writeFile(imagePath, buffer);
      } catch (canvasError) {
        console.warn('Canvas rendering failed, using solid color background:', canvasError);
        // Fallback: create a simple solid color image or skip video generation
        const { writeFile } = await import('fs/promises');
        // Create a minimal 1x1 pixel PNG as fallback
        const minimalPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        await writeFile(imagePath, minimalPng);
      }
      
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