import { z } from 'zod';
export declare const generateRequestSchema: z.ZodObject<{
    prompt: z.ZodString;
    duration: z.ZodNumber;
    includeVideo: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    duration: number;
    includeVideo: boolean;
}, {
    prompt: string;
    duration: number;
    includeVideo?: boolean | undefined;
}>;
export declare const jobIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const assetIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const jobResponseSchema: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodEnum<["pending", "processing", "completed", "failed"]>;
    prompt: z.ZodString;
    duration: z.ZodNumber;
    includeVideo: z.ZodBoolean;
    plan: z.ZodNullable<z.ZodAny>;
    assets: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["audio", "video", "plan"]>;
        url: z.ZodString;
        size: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "plan" | "audio" | "video";
        url: string;
        id: string;
        size: number | null;
    }, {
        type: "plan" | "audio" | "video";
        url: string;
        id: string;
        size: number | null;
    }>, "many">;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "processing" | "completed" | "failed";
    id: string;
    createdAt: Date;
    prompt: string;
    duration: number;
    includeVideo: boolean;
    updatedAt: Date;
    assets: {
        type: "plan" | "audio" | "video";
        url: string;
        id: string;
        size: number | null;
    }[];
    plan?: any;
}, {
    status: "pending" | "processing" | "completed" | "failed";
    id: string;
    createdAt: Date;
    prompt: string;
    duration: number;
    includeVideo: boolean;
    updatedAt: Date;
    assets: {
        type: "plan" | "audio" | "video";
        url: string;
        id: string;
        size: number | null;
    }[];
    plan?: any;
}>;
export declare const assetResponseSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["audio", "video", "plan"]>;
    url: z.ZodString;
    size: z.ZodNullable<z.ZodNumber>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    type: "plan" | "audio" | "video";
    url: string;
    id: string;
    createdAt: Date;
    size: number | null;
}, {
    type: "plan" | "audio" | "video";
    url: string;
    id: string;
    createdAt: Date;
    size: number | null;
}>;
export declare const healthResponseSchema: z.ZodObject<{
    status: z.ZodString;
    timestamp: z.ZodString;
    database: z.ZodString;
    ffmpeg: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: string;
    ffmpeg: string;
    timestamp: string;
    database: string;
}, {
    status: string;
    ffmpeg: string;
    timestamp: string;
    database: string;
}>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type JobResponse = z.infer<typeof jobResponseSchema>;
export type AssetResponse = z.infer<typeof assetResponseSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
