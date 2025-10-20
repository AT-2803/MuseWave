import { z } from 'zod';
export declare const planRequestSchema: z.ZodObject<{
    prompt: z.ZodOptional<z.ZodString>;
    genre: z.ZodOptional<z.ZodEnum<["edm", "pop", "rock", "lofi"]>>;
    bpm: z.ZodOptional<z.ZodNumber>;
    durationSec: z.ZodOptional<z.ZodNumber>;
    structure: z.ZodOptional<z.ZodArray<z.ZodObject<{
        section: z.ZodEnum<["intro", "verse", "chorus", "bridge", "outro"]>;
        lengthBars: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        section: "intro" | "verse" | "chorus" | "bridge" | "outro";
        lengthBars: number;
    }, {
        section: "intro" | "verse" | "chorus" | "bridge" | "outro";
        lengthBars: number;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    prompt?: string | undefined;
    genre?: "pop" | "rock" | "edm" | "lofi" | undefined;
    bpm?: number | undefined;
    durationSec?: number | undefined;
    structure?: {
        section: "intro" | "verse" | "chorus" | "bridge" | "outro";
        lengthBars: number;
    }[] | undefined;
}, {
    prompt?: string | undefined;
    genre?: "pop" | "rock" | "edm" | "lofi" | undefined;
    bpm?: number | undefined;
    durationSec?: number | undefined;
    structure?: {
        section: "intro" | "verse" | "chorus" | "bridge" | "outro";
        lengthBars: number;
    }[] | undefined;
}>;
export declare const generateAudioSchema: z.ZodObject<{
    planAssetId: z.ZodString;
    provider: z.ZodDefault<z.ZodEnum<["mock", "external"]>>;
    seed: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    planAssetId: string;
    provider: "mock" | "external";
    seed?: number | undefined;
}, {
    planAssetId: string;
    provider?: "mock" | "external" | undefined;
    seed?: number | undefined;
}>;
export declare const generateVocalsSchema: z.ZodObject<{
    lyrics: z.ZodString;
    lang: z.ZodOptional<z.ZodString>;
    voice: z.ZodOptional<z.ZodString>;
    align: z.ZodDefault<z.ZodEnum<["phoneme", "grapheme"]>>;
    musicAssetId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    lyrics: string;
    align: "phoneme" | "grapheme";
    lang?: string | undefined;
    voice?: string | undefined;
    musicAssetId?: string | undefined;
}, {
    lyrics: string;
    lang?: string | undefined;
    voice?: string | undefined;
    align?: "phoneme" | "grapheme" | undefined;
    musicAssetId?: string | undefined;
}>;
export declare const generateMixSchema: z.ZodObject<{
    stems: z.ZodObject<{
        drums: z.ZodString;
        bass: z.ZodString;
        lead: z.ZodString;
        vocals: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        drums: string;
        bass: string;
        lead: string;
        vocals?: string | undefined;
    }, {
        drums: string;
        bass: string;
        lead: string;
        vocals?: string | undefined;
    }>;
    targetLufs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    stems: {
        drums: string;
        bass: string;
        lead: string;
        vocals?: string | undefined;
    };
    targetLufs: number;
}, {
    stems: {
        drums: string;
        bass: string;
        lead: string;
        vocals?: string | undefined;
    };
    targetLufs?: number | undefined;
}>;
export declare const generateVideoSchema: z.ZodObject<{
    audioAssetId: z.ZodString;
    style: z.ZodDefault<z.ZodEnum<["waveform", "particles"]>>;
    resolution: z.ZodDefault<z.ZodEnum<["1080p", "720p"]>>;
    fps: z.ZodDefault<z.ZodNumber>;
    coverImageAssetId: z.ZodOptional<z.ZodString>;
    captionsAssetId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    audioAssetId: string;
    style: "waveform" | "particles";
    resolution: "1080p" | "720p";
    fps: number;
    coverImageAssetId?: string | undefined;
    captionsAssetId?: string | undefined;
}, {
    audioAssetId: string;
    style?: "waveform" | "particles" | undefined;
    resolution?: "1080p" | "720p" | undefined;
    fps?: number | undefined;
    coverImageAssetId?: string | undefined;
    captionsAssetId?: string | undefined;
}>;
