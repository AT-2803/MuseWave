export interface NgramModel {
  vocab: { degrees: number[]; durations: number[]; scale: string };
  trans_prob: { [key: string]: { [next: string]: number } };
}

export function train(tokens: { degree: number; duration: number }[], order: number = 3): NgramModel {
  const vocab = {
    degrees: Array.from(new Set(tokens.map(t => t.degree))),
    durations: Array.from(new Set(tokens.map(t => t.duration))),
    scale: 'major', // Assume
  };
  const trans_prob: { [key: string]: { [next: string]: number } } = {};
  for (let i = order; i < tokens.length; i++) {
    const context = tokens.slice(i - order, i).map(t => `${t.degree}|${t.duration}`).join('|');
    const next = `${tokens[i].degree}|${tokens[i].duration}`;
    if (!trans_prob[context]) trans_prob[context] = {};
    trans_prob[context][next] = (trans_prob[context][next] || 0) + 1;
  }
  // Laplace smoothing
  for (const context in trans_prob) {
    const total = Object.values(trans_prob[context]).reduce((a, b) => a + b, 0) + vocab.degrees.length * vocab.durations.length;
    for (const next in trans_prob[context]) {
      trans_prob[context][next] = (trans_prob[context][next] + 1) / total;
    }
  }
  return { vocab, trans_prob };
}

export function sample(model: NgramModel, len: number, seed?: number): { degree: number; duration: number }[] {
  const rng = seed ? xorshift(seed) : Math.random;
  const sequence: { degree: number; duration: number }[] = [];
  for (let i = 0; i < len; i++) {
    const context = sequence.slice(-3).map(t => `${t.degree}|${t.duration}`).join('|');
    const probs = model.trans_prob[context] || {};
    const rand = rng();
    let cum = 0;
    for (const next in probs) {
      cum += probs[next];
      if (rand < cum) {
        const [deg, dur] = next.split('|').map(Number);
        sequence.push({ degree: deg, duration: dur });
        break;
      }
    }
  }
  return sequence;
}

export async function seedNgramModel(): Promise<void> {
  // Train n-gram model from MIDI file library
  try {
    const { readdir, readFile: readFilePromise } = await import('fs/promises');
    const { parseMidi } = await import('midi-file');
    const { join } = await import('path');
    
    const midiDir = process.env.MIDI_LIBRARY_PATH || './data/midi';
    
    try {
      const files = await readdir(midiDir);
      const midiFiles = files.filter(f => f.endsWith('.mid') || f.endsWith('.midi'));
      
      if (midiFiles.length === 0) {
        console.warn('[Markov] No MIDI files found, using default sample');
        return trainDefaultModel();
      }
      
      const allTokens: { degree: number; duration: number }[] = [];
      
      for (const file of midiFiles.slice(0, 100)) { // Limit to 100 files
        try {
          const path = join(midiDir, file);
          const buffer = await readFilePromise(path);
          const midi = parseMidi(buffer);
          
          // Extract note events from MIDI tracks
          midi.tracks.forEach(track => {
            let currentTick = 0;
            track.forEach(event => {
              currentTick += event.deltaTime;
              if (event.type === 'noteOn' && event.velocity > 0) {
                const degree = event.noteNumber % 12; // Normalize to scale degree
                const duration = event.deltaTime / midi.header.ticksPerBeat; // Convert to beats
                if (duration > 0 && duration < 8) { // Filter out invalid durations
                  allTokens.push({ degree, duration: Math.round(duration * 2) / 2 }); // Quantize to half beats
                }
              }
            });
          });
        } catch (fileError) {
          console.warn(`[Markov] Error parsing ${file}:`, fileError);
        }
      }
      
      if (allTokens.length < 100) {
        console.warn('[Markov] Insufficient MIDI data, using default model');
        return trainDefaultModel();
      }
      
      const model = train(allTokens, 3);
      
      // Save model to database or cache
      // For now, just log success
      console.log(`[Markov] Trained model from ${midiFiles.length} MIDI files with ${allTokens.length} tokens`);
      
    } catch (dirError) {
      console.warn('[Markov] MIDI directory not accessible, using default model:', dirError);
      return trainDefaultModel();
    }
    
  } catch (error) {
    console.error('[Markov] Model training failed:', error);
    return trainDefaultModel();
  }
}

function trainDefaultModel() {
  const sampleTokens = [
    { degree: 0, duration: 1 }, { degree: 2, duration: 1 }, { degree: 4, duration: 2 },
    { degree: 5, duration: 1 }, { degree: 7, duration: 1 }, { degree: 9, duration: 2 },
    { degree: 0, duration: 1 }, { degree: 2, duration: 1 }, { degree: 4, duration: 2 },
    { degree: 0, duration: 0.5 }, { degree: 4, duration: 0.5 }, { degree: 7, duration: 1 },
    { degree: 5, duration: 0.5 }, { degree: 9, duration: 0.5 }, { degree: 11, duration: 2 },
  ];
  const model = train(sampleTokens, 2);
  console.log('[Markov] Using default sample model');
  return model;
}

function xorshift(seed: number) {
  let x = seed;
  return () => {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
}