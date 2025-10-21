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
  // Placeholder: in practice, load MIDI files and train
  const sampleTokens = [
    { degree: 0, duration: 1 }, { degree: 2, duration: 1 }, { degree: 4, duration: 2 },
    { degree: 0, duration: 1 }, { degree: 2, duration: 1 }, { degree: 4, duration: 2 },
  ];
  const model = train(sampleTokens);
  // Save to DB or file
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