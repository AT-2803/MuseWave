import { genreBpm } from './theory';
import { NgramModel } from '../model/markov';

export interface MusicPlan {
  key: string;
  scale: string;
  bpm: number;
  model: NgramModel;
  structure: string[];
}

export async function generatePlan(prompt: string, genre: string): Promise<MusicPlan> {
  // Simple rule-based planning
  const bpm = genreBpm[genre] || 120;
  const key = 'C';
  const scale = 'major';
  const model: NgramModel = {
    vocab: { degrees: [0, 2, 4, 5, 7], durations: [1, 2], scale },
    trans_prob: {
      '0|1': { '2|1': 0.5, '4|2': 0.5 },
      '2|1': { '4|1': 0.5, '0|2': 0.5 },
      '4|1': { '5|1': 0.5, '2|2': 0.5 },
      '5|1': { '7|1': 0.5, '4|2': 0.5 },
      '7|1': { '0|1': 0.5, '5|2': 0.5 },
      '0|2': { '4|1': 0.5, '2|2': 0.5 },
      '4|2': { '0|1': 0.5, '5|1': 0.5 },
      '2|2': { '0|1': 0.5, '4|1': 0.5 },
      '5|2': { '4|1': 0.5, '7|1': 0.5 },
    },
  };
  const structure = ['intro', 'verse', 'chorus', 'verse', 'chorus', 'outro'];
  return { key, scale, bpm, model, structure };
}