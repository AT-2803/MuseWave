export const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const scales = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

export function degreeToHz(degree: number, key: string, scale: 'major' | 'minor', octave: number = 4): number {
  const keyIndex = keys.indexOf(key);
  const scaleDegrees = scales[scale];
  const semitone = scaleDegrees[degree % 7] + Math.floor(degree / 7) * 12 + keyIndex + (octave - 4) * 12;
  return 440 * Math.pow(2, (semitone - 9) / 12); // A4 = 440
}

export function chordFromRoman(roman: string, key: string, scale: 'major' | 'minor'): number[] {
  const romanMap: { [k: string]: number } = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 };
  const degree = romanMap[roman.toUpperCase()];
  const root = degreeToHz(degree, key, scale);
  return [root, root * 5/4, root * 3/2]; // Major triad
}

export const genreBpm: { [k: string]: number } = {
  techno: 128,
  edm: 124,
  pop: 116,
  rock: 100,
  lofi: 80,
  ambient: 85,
};