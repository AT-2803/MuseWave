import { z } from 'zod';
export const planRequestSchema = z.object({
    prompt: z.string().optional(),
    genre: z.enum(['edm', 'pop', 'rock', 'lofi']).optional(),
    bpm: z.number().int().positive().optional(),
    durationSec: z.number().positive().max(3600).optional(),
    structure: z
        .array(z.object({
        section: z.enum(['intro', 'verse', 'chorus', 'bridge', 'outro']),
        lengthBars: z.number().int().positive(),
    }))
        .optional(),
});
export const generateAudioSchema = z.object({
    planAssetId: z.string(),
    provider: z.enum(['mock', 'external']).default('mock'),
    seed: z.number().int().optional(),
});
export const generateVocalsSchema = z.object({
    lyrics: z.string().min(1),
    lang: z.string().optional(),
    voice: z.string().optional(),
    align: z.enum(['phoneme', 'grapheme']).default('grapheme'),
    musicAssetId: z.string().optional(),
});
export const generateMixSchema = z.object({
    stems: z.object({
        drums: z.string(),
        bass: z.string(),
        lead: z.string(),
        vocals: z.string().optional(),
    }),
    targetLufs: z.number().default(-14),
});
export const generateVideoSchema = z.object({
    audioAssetId: z.string(),
    style: z.enum(['waveform', 'particles']).default('waveform'),
    resolution: z.enum(['1080p', '720p']).default('1080p'),
    fps: z.number().int().positive().max(60).default(30),
    coverImageAssetId: z.string().optional(),
    captionsAssetId: z.string().optional(),
});
