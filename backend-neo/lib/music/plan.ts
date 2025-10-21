import { genreBpm } from './theory';
import { NgramModel } from '../model/markov';
import { fuseGenres, HARMONY_MODES } from './genres';

export interface MusicPlan {
  key: string;
  scale: string;
  bpm: number;
  swing: number;
  model: NgramModel;
  structure: string[];
  drumPattern: {
    kick: string;
    snare: string;
    hats: string;
  };
  bassStyle: string;
  energy: number;
  reverb: number;
  distortion: number;
  chordProgression: string[];
}

export async function generatePlan(prompt: string, genres: string[]): Promise<MusicPlan> {
  // Fuse genres to get production parameters
  const fusion = fuseGenres(genres);
  
  // Select key based on prompt sentiment (simplified: use C for now)
  const key = 'C';
  const harmonyMode = HARMONY_MODES[fusion.harmonyMode as keyof typeof HARMONY_MODES] || HARMONY_MODES.minor;
  const scale = fusion.harmonyMode.includes('major') ? 'major' : 'minor';
  
  // Build n-gram model from harmony
  const model: NgramModel = {
    vocab: { 
      degrees: harmonyMode.scale, 
      durations: [1, 2, 4], 
      scale 
    },
    trans_prob: buildTransitionProbs(harmonyMode.scale)
  };
  
  // Structure based on duration and energy
  const structure = fusion.energy > 0.7 
    ? ['intro', 'buildup', 'drop', 'verse', 'buildup', 'drop', 'outro']
    : ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'outro'];
  
  return {
    key,
    scale,
    bpm: fusion.bpm,
    swing: fusion.swing,
    model,
    structure,
    drumPattern: {
      kick: fusion.kickPattern,
      snare: fusion.snarePattern,
      hats: fusion.hatsPattern
    },
    bassStyle: fusion.bassStyle,
    energy: fusion.energy,
    reverb: fusion.reverb,
    distortion: fusion.distortion,
    chordProgression: harmonyMode.chords
  };
}

function buildTransitionProbs(scale: readonly number[]): { [key: string]: { [next: string]: number } } {
  const probs: { [key: string]: { [next: string]: number } } = {};
  
  // Build simple Markov chain for melody
  scale.forEach((degree, i) => {
    const durations = [1, 2, 4];
    durations.forEach(dur => {
      const state = `${degree}|${dur}`;
      probs[state] = {};
      
      // Prefer stepwise motion and rhythmic variation
      scale.forEach((nextDegree, j) => {
        const distance = Math.abs(j - i);
        durations.forEach(nextDur => {
          const next = `${nextDegree}|${nextDur}`;
          const stepwiseWeight = 1 / (1 + distance);
          const rhythmicVariation = dur === nextDur ? 0.3 : 0.7;
          probs[state][next] = stepwiseWeight * rhythmicVariation;
        });
      });
      
      // Normalize
      const total = Object.values(probs[state]).reduce((sum, p) => sum + p, 0);
      Object.keys(probs[state]).forEach(next => {
        probs[state][next] /= total;
      });
    });
  });
  
  return probs;
}