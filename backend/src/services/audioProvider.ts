import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomInt } from 'crypto';
import { prisma } from '../db';
import { saveAssetFromBuffer } from './assets';
import { runFfmpeg } from '../utils/ffmpeg';
import { logger } from '../logger';

interface PlanSection {
  section: string;
  lengthBars: number;
  startSec: number;
  energy: number;
}

interface PlanAssetMeta {
  plan?: {
    title: string;
    bpm: number;
    durationSec: number;
    genre: string;
    key?: string;
    structure: PlanSection[];
    stems: Record<string, boolean>;
  };
}

function parsePlanMeta(metaString: string | null, jsonBuffer: Buffer | null) {
  if (metaString) {
    try {
      return JSON.parse(metaString) as PlanAssetMeta;
    } catch (error) {
      logger.warn({ err: error }, 'Failed to parse plan meta string');
    }
  }
  if (jsonBuffer) {
    try {
      return { plan: JSON.parse(jsonBuffer.toString('utf-8')) } as PlanAssetMeta;
    } catch (error) {
      logger.warn({ err: error }, 'Failed to parse plan JSON file');
    }
  }
  return {} as PlanAssetMeta;
}

function keyToFrequency(key?: string) {
  if (!key) return 55; // A1
  const match = key.match(/[A-G][#b]?/i);
  const note = match ? match[0].toUpperCase() : 'A';
  const mapping: Record<string, number> = {
    C: 32.70,
    'C#': 34.65,
    DB: 34.65,
    D: 36.71,
    'D#': 38.89,
    EB: 38.89,
    E: 41.20,
    F: 43.65,
    'F#': 46.25,
    GB: 46.25,
    G: 49.00,
    'G#': 51.91,
    AB: 51.91,
    A: 55.00,
    'A#': 58.27,
    BB: 58.27,
    B: 61.74,
  };
  return mapping[note] ?? 55;
}

async function fileToAsset(filePath: string, mime: string, meta: Record<string, unknown>, durationSec: number) {
  const buffer = await fs.readFile(filePath);
  return saveAssetFromBuffer({ buffer, mime, meta, durationSec, extension: path.extname(filePath) });
}

export class MockAudioProvider {
  async generate(planAssetId: string, seed?: number) {
    const asset = await prisma.asset.findUnique({ where: { id: planAssetId } });
    if (!asset) {
      throw new Error('Plan asset not found');
    }

    let planBuffer: Buffer | null = null;
    try {
      planBuffer = await fs.readFile(asset.path);
    } catch (error) {
      logger.warn({ err: error }, 'Unable to read plan asset file');
    }

    const meta = parsePlanMeta(asset.meta ?? null, planBuffer);
    if (!meta.plan) {
      throw new Error('Plan data unavailable');
    }

    const plan = meta.plan;
    const duration = plan.durationSec ?? 90;
    const bpm = plan.bpm ?? 120;
    const baseFrequency = keyToFrequency(plan.key);

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-audio-'));
    const drumsPath = path.join(tmpDir, 'drums.wav');
    const bassPath = path.join(tmpDir, 'bass.wav');
    const leadPath = path.join(tmpDir, 'lead.wav');
    const previewPath = path.join(tmpDir, 'preview.wav');

    try {
      await runFfmpeg([
        '-f',
        'lavfi',
        '-i',
        `anoisesrc=color=pink:amplitude=0.5:duration=${duration}`,
        '-af',
        `atrim=0:${duration},acompressor=threshold=0.3:ratio=6,agate=attack=20:release=120:threshold=0.4:ratio=3, aecho=0.6:0.5:40:0.3,volume=0.8`,
        '-t',
        String(duration),
        drumsPath,
      ]);

      const bassFrequency = baseFrequency * 2;
      await runFfmpeg([
        '-f',
        'lavfi',
        '-i',
        `sine=frequency=${bassFrequency}:sample_rate=44100:duration=${duration}`,
        '-af',
        `atrim=0:${duration},acompressor=threshold=0.2:ratio=4,lowpass=f=200,volume=0.7`,
        '-t',
        String(duration),
        bassPath,
      ]);

      const leadFrequency = baseFrequency * 4;
      const leadVibrato = 3 + (seed ? (seed % 4) : randomInt(1, 5));
      await runFfmpeg([
        '-f',
        'lavfi',
        '-i',
        `sine=frequency=${leadFrequency}:sample_rate=44100:duration=${duration}`,
        '-af',
        `atrim=0:${duration},vibrato=f=${leadVibrato}:d=0.9,highpass=f=600,volume=0.6`,
        '-t',
        String(duration),
        leadPath,
      ]);

      await runFfmpeg([
        '-i',
        drumsPath,
        '-i',
        bassPath,
        '-i',
        leadPath,
        '-filter_complex',
        '[0:a]volume=0.9[a0];[1:a]volume=0.8[a1];[2:a]volume=0.75[a2];[a0][a1][a2]amix=inputs=3:normalize=0,alimiter, dynaudnorm, loudnorm=I=-14:TP=-1:LRA=11[out]',
        '-map',
        '[out]',
        '-ac',
        '2',
        previewPath,
      ]);

      const drumsAsset = await fileToAsset(drumsPath, 'audio/wav', { kind: 'stem', instrument: 'drums', planAssetId }, duration);
      const bassAsset = await fileToAsset(bassPath, 'audio/wav', { kind: 'stem', instrument: 'bass', planAssetId }, duration);
      const leadAsset = await fileToAsset(leadPath, 'audio/wav', { kind: 'stem', instrument: 'lead', planAssetId }, duration);
      const previewAsset = await fileToAsset(previewPath, 'audio/wav', { kind: 'preview', planAssetId }, duration);

      return {
        stems: {
          drums: drumsAsset.id,
          bass: bassAsset.id,
          lead: leadAsset.id,
        },
        previewAssetId: previewAsset.id,
        durationSec: duration,
      } as const;
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }
}
