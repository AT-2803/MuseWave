import { z } from 'zod';

// Request schemas
export const generateRequestSchema = z.object({
  prompt: z.string().min(1).max(1000),
  duration: z.number().int().min(10).max(300), // 10 seconds to 5 minutes
  includeVideo: z.boolean().default(false),
});

export const jobIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const assetIdParamSchema = z.object({
  id: z.string().cuid(),
});

// Response schemas
export const jobResponseSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  prompt: z.string(),
  duration: z.number().int(),
  includeVideo: z.boolean(),
  plan: z.any().nullable(),
  assets: z.array(z.object({
    id: z.string().cuid(),
    type: z.enum(['audio', 'video', 'plan']),
    url: z.string(),
    size: z.number().int().nullable(),
  })),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const assetResponseSchema = z.object({
  id: z.string().cuid(),
  type: z.enum(['audio', 'video', 'plan']),
  url: z.string(),
  size: z.number().int().nullable(),
  createdAt: z.date(),
});

export const healthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  database: z.string(),
  ffmpeg: z.string(),
});

// Types
export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type JobResponse = z.infer<typeof jobResponseSchema>;
export type AssetResponse = z.infer<typeof assetResponseSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;