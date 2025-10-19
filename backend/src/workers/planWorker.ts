import { randomInt } from 'crypto';
import { logger } from '../logger';
import { Queue } from '../queue';
import { planRequestSchema } from '../routes/validators';
import { saveAssetFromBuffer } from '../services/assets';
import { JOB_TYPE } from '../types';

const DEFAULT_STRUCTURE = [
  { section: 'intro' as const, lengthBars: 8 },
  { section: 'verse' as const, lengthBars: 16 },
  { section: 'chorus' as const, lengthBars: 16 },
  { section: 'bridge' as const, lengthBars: 8 },
  { section: 'chorus' as const, lengthBars: 16 },
  { section: 'outro' as const, lengthBars: 8 },
];

const SECTION_ENERGY: Record<string, number> = {
  intro: 0.2,
  verse: 0.45,
  chorus: 0.85,
  bridge: 0.55,
  outro: 0.25,
};

const SCALE_KEYS = ['C Minor', 'D Minor', 'E Minor', 'A Minor', 'G Minor', 'F Minor', 'B Minor'];

function generateTitle(genre?: string, prompt?: string) {
  if (prompt) {
    return prompt.length > 60 ? `${prompt.slice(0, 57)}...` : prompt;
  }
  return `MuseWave ${genre?.toUpperCase() ?? 'TRACK'}`;
}

export function registerPlanWorker(queue: Queue) {
  queue.registerWorker({
    type: JOB_TYPE.PLAN,
    concurrency: 2,
    handler: async ({ params }) => {
      const input = planRequestSchema.parse(params);
      const genre = input.genre ?? 'edm';
      const bpm = input.bpm ?? 124;
      const structure = input.structure ?? DEFAULT_STRUCTURE;
      const totalBars = structure.reduce((acc, section) => acc + section.lengthBars, 0);
      const secondsPerBar = (60 / bpm) * 4;
      const durationFromStructure = totalBars * secondsPerBar;
      const durationSec = input.durationSec ?? durationFromStructure;

      let currentBar = 0;
      let currentTime = 0;
      const sections = structure.map((entry, idx) => {
        const startBar = currentBar;
        const startSec = currentTime;
        const lengthBars = entry.lengthBars;
        const lengthSec = lengthBars * secondsPerBar;
        currentBar += lengthBars;
        currentTime += lengthSec;
        return {
          index: idx,
          section: entry.section,
          lengthBars,
          startBar,
          startSec,
          energy: SECTION_ENERGY[entry.section] ?? 0.5,
          notes: `${entry.section} section generated at ${bpm} BPM`,
        };
      });

      const keyIndex = randomInt(0, SCALE_KEYS.length);
      const plan = {
        title: generateTitle(genre, input.prompt),
        prompt: input.prompt ?? null,
        genre,
        bpm,
        durationSec,
        key: SCALE_KEYS[keyIndex],
        structure: sections,
        stems: {
          drums: true,
          bass: true,
          lead: true,
          vocals: false,
        },
        createdAt: new Date().toISOString(),
      };

      const asset = await saveAssetFromBuffer({
        buffer: Buffer.from(JSON.stringify(plan, null, 2), 'utf-8'),
        mime: 'application/json',
        extension: '.json',
        meta: { plan },
        durationSec,
      });

      logger.debug({ planAssetId: asset.id }, 'Plan asset created');

      return {
        result: { planAssetId: asset.id, plan },
        assetId: asset.id,
      };
    },
  });
}
