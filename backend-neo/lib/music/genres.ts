// Genre-based music theory and production parameters
export const GENRE_PRESETS = {
  "post-punk revival": {
    bpm: [138, 156],
    swing: 0.02,
    kick: "2&4-drive",
    snare: "2+4",
    hats: "8th",
    bass: "eighth-pulse",
    harmony: "minor_rock",
    energy: 0.8,
    reverb: 0.3,
    distortion: 0.4
  },
  "ambient techno": {
    bpm: [110, 128],
    swing: 0.00,
    kick: "4onthefloor",
    snare: "2+4-soft",
    hats: "offbeat-open",
    bass: "sub-drone",
    harmony: "modal_minor",
    energy: 0.5,
    reverb: 0.7,
    distortion: 0.1
  },
  "drum & bass": {
    bpm: [170, 176],
    swing: 0.01,
    kick: "dnb-syncop",
    snare: "2+4-bright",
    hats: "16th-shuffle",
    bass: "reese",
    harmony: "modal_minor",
    energy: 0.95,
    reverb: 0.2,
    distortion: 0.3
  },
  "future garage": {
    bpm: [130, 140],
    swing: 0.12,
    kick: "ukg-syncop",
    snare: "3",
    hats: "shuffled-16th",
    bass: "wubby",
    harmony: "minor_ukg",
    energy: 0.7,
    reverb: 0.5,
    distortion: 0.2
  },
  "lofi hip hop": {
    bpm: [72, 86],
    swing: 0.10,
    kick: "boom-bap",
    snare: "3",
    hats: "triplet-ghosts",
    bass: "808-soft",
    harmony: "minor_lofi",
    energy: 0.4,
    reverb: 0.4,
    distortion: 0.15
  },
  "trap": {
    bpm: [134, 150],
    swing: 0.06,
    kick: "808-grid",
    snare: "3",
    hats: "triplets-rolls",
    bass: "808-long",
    harmony: "harm_minor",
    energy: 0.85,
    reverb: 0.25,
    distortion: 0.2
  },
  "techno": {
    bpm: [128, 135],
    swing: 0.0,
    kick: "4onthefloor",
    snare: "2+4",
    hats: "16th",
    bass: "acid-303",
    harmony: "minor",
    energy: 0.9,
    reverb: 0.3,
    distortion: 0.3
  },
  "house": {
    bpm: [120, 128],
    swing: 0.05,
    kick: "4onthefloor",
    snare: "2+4-clap",
    hats: "8th-open",
    bass: "deep",
    harmony: "major",
    energy: 0.75,
    reverb: 0.35,
    distortion: 0.1
  }
} as const;

export type GenreKey = keyof typeof GENRE_PRESETS;

export interface GenreFusion {
  bpm: number;
  swing: number;
  kickPattern: string;
  snarePattern: string;
  hatsPattern: string;
  bassStyle: string;
  harmonyMode: string;
  energy: number;
  reverb: number;
  distortion: number;
}

export function fuseGenres(genres: string[], weights?: number[]): GenreFusion {
  const validGenres = genres.filter(g => g in GENRE_PRESETS);
  if (validGenres.length === 0) {
    validGenres.push("techno"); // fallback
  }
  
  const genreWeights = weights || validGenres.map(() => 1 / validGenres.length);
  
  // Weighted BPM average
  let bpmSum = 0;
  let swingSum = 0;
  let energySum = 0;
  let reverbSum = 0;
  let distortionSum = 0;
  
  validGenres.forEach((genre, idx) => {
    const preset = GENRE_PRESETS[genre as GenreKey];
    const weight = genreWeights[idx] || 1 / validGenres.length;
    bpmSum += ((preset.bpm[0] + preset.bpm[1]) / 2) * weight;
    swingSum += preset.swing * weight;
    energySum += preset.energy * weight;
    reverbSum += preset.reverb * weight;
    distortionSum += preset.distortion * weight;
  });
  
  // Primary genre determines patterns
  const primaryGenre = GENRE_PRESETS[validGenres[0] as GenreKey];
  
  return {
    bpm: Math.round(bpmSum),
    swing: swingSum,
    kickPattern: primaryGenre.kick,
    snarePattern: primaryGenre.snare,
    hatsPattern: primaryGenre.hats,
    bassStyle: primaryGenre.bass,
    harmonyMode: primaryGenre.harmony,
    energy: energySum,
    reverb: reverbSum,
    distortion: distortionSum
  };
}

export const HARMONY_MODES = {
  minor_rock: { scale: [0, 2, 3, 5, 7, 8, 10], chords: ["i", "III", "iv", "v"] },
  modal_minor: { scale: [0, 2, 3, 5, 7, 9, 10], chords: ["i", "VII", "VI", "iv"] },
  minor_ukg: { scale: [0, 2, 3, 5, 7, 8, 11], chords: ["i", "VI", "III", "VII"] },
  minor_lofi: { scale: [0, 2, 3, 5, 7, 8, 10], chords: ["i", "iv", "v", "VI"] },
  harm_minor: { scale: [0, 2, 3, 5, 7, 8, 11], chords: ["i", "iv", "V", "VI"] },
  minor: { scale: [0, 2, 3, 5, 7, 8, 10], chords: ["i", "iv", "v", "VI"] },
  major: { scale: [0, 2, 4, 5, 7, 9, 11], chords: ["I", "IV", "V", "vi"] }
} as const;