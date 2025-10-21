import { sql } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

export async function trainModel(name: string, midiFilesBase64: string[], style: string) {
  // Simplified: parse MIDI, build N-gram
  const vocab = { degrees: [0,1,2,3,4,5,6,7], durations: [1,2,4], scale: 'major' };
  const transProb = {}; // Build probabilities
  const id = uuidv4();
  await sql`INSERT INTO ngram_models (id, name, vocab, trans_prob) VALUES (${id}, ${name}, ${JSON.stringify(vocab)}, ${JSON.stringify(transProb)})`;
  return { id };
}

export function sampleSequence(seed: number, length: number) {
  // Use PRNG to sample sequence
  const rng = xorshift(seed);
  return Array.from({ length }, () => Math.floor(rng() * 8));
}

function xorshift(seed: number) {
  let x = seed;
  return () => {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return (x >>> 0) / 0x100000000;
  };
}