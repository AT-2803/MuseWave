import type { VideoStyle } from '../lib/types';

declare const Buffer: any;

type Stage = { status: string; label: string };

export type OrchestratorEvent = {
  step?: number;
  label?: string;
  pct?: number;
  status?: string;
  error?: string;
};

export type OrchestratorResult = {
  audioUrl?: string | null;
  videoUrls?: Partial<Record<VideoStyle | string, string>> | null;
  plan?: any;
  error?: string;
};

type MockJob = {
  plan: GeneratedPlan | null;
  result: OrchestratorResult;
  timers: number[];
  stages: Stage[];
  wantsVideo: boolean;
};

type GeneratedPlan = {
  title: string;
  genre: string;
  duration_sec: number;
  bpm: number;
  key: string;
  sections: string[];
  bars_per_section: number;
  chord_progressions: Record<string, string[]>;
  lyrics_lines: { section: string; text: string }[];
  artist_style_notes: string[];
  instrumentation: string[];
  arrangement_notes: string[];
  energy_curve: { section: string; level: number }[];
};

type TimelineEvent = {
  startSample: number;
  durationSamples: number;
  chord: string;
  section: string;
  bar: number;
};

const jobs = new Map<string, MockJob>();

const BASE_STAGES: Stage[] = [
  { status: 'planning', label: 'Drafting AI blueprint...' },
  { status: 'generating-instruments', label: 'Sculpting instruments and rhythm...' },
  { status: 'synthesizing-vocals', label: 'Synthesizing vocals...' },
  { status: 'mixing-mastering', label: 'Mixing and mastering...' },
  { status: 'rendering-video', label: 'Rendering visuals and lyric video...' },
  { status: 'finalizing', label: 'Packaging final assets...' },
];

const setTimeoutFn =
  typeof window !== 'undefined' && window.setTimeout
    ? window.setTimeout.bind(window)
    : globalThis.setTimeout.bind(globalThis);

const clearTimeoutFn =
  typeof window !== 'undefined' && window.clearTimeout
    ? window.clearTimeout.bind(window)
    : globalThis.clearTimeout.bind(globalThis);

const encodeBase64 = (text: string) => {
  if (typeof window !== 'undefined' && window.btoa) {
    return window.btoa(text);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(text, 'utf-8').toString('base64');
  }
  throw new Error('Base64 encoding is not supported in this environment');
};

const createTextDataUri = (text: string, mime = 'text/plain') =>
  `data:${mime};base64,${encodeBase64(text)}`;

export async function startGeneration(payload: Record<string, unknown>) {
  // Call backend API
  const response = await fetch('/api/generate/pipeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Generation failed: ${response.statusText}`);
  }
  const data = await response.json();
  return { jobId: data.jobId, plan: null }; // Backend doesn't return plan immediately
}

export function subscribeToJob(
  jobId: string,
  onEvent: (event: OrchestratorEvent) => void,
  onError: (err: any) => void
) {
  let polling = true;
  const poll = async () => {
    if (!polling) return;
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error(`Job fetch failed: ${response.statusText}`);
      }
      const job = await response.json();
      if (job.status === 'succeeded') {
        onEvent({ status: 'complete', pct: 100 });
      } else if (job.status === 'failed') {
        onEvent({ status: 'error', error: job.error });
      } else {
        // Map backend status to frontend
        const statusMap: Record<string, string> = {
          running: 'generating-instruments', // or whatever
        };
        onEvent({ status: statusMap[job.status] || job.status, pct: 50 }); // approximate
      }
      if (job.status === 'succeeded' || job.status === 'failed') {
        polling = false;
      } else {
        setTimeout(poll, 2000); // poll every 2s
      }
    } catch (err) {
      onError(err);
      polling = false;
    }
  };
  poll();
  return {
    close() {
      polling = false;
    },
  };
}

export async function fetchJobResult(jobId: string): Promise<OrchestratorResult> {
  const response = await fetch(`/api/jobs/${jobId}`);
  if (!response.ok) {
    return { error: `Fetch failed: ${response.statusText}` };
  }
  const job = await response.json();
  if (job.status === 'succeeded') {
    return {
      audioUrl: job.result ? `/api/assets/${job.result}` : null,
      videoUrls: null, // TODO
      plan: null, // TODO
    };
  } else if (job.status === 'failed') {
    return { error: job.error };
  } else {
    return { error: 'Job not complete' };
  }
}

async function generateVideoPreviews(
  jobId: string,
  styles: string[],
  storyboardCatalog: Record<string, string>,
  duration: number
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  await Promise.all(
    styles.map(async (style) => {
      const entryBefore = jobs.get(jobId);
      const plan = (entryBefore?.plan ?? null) as GeneratedPlan | null;
      try {
        const dataUrl = await createRecordedVideoDataUri(
          Math.min(6, duration || 6),
          `Style: ${style}`,
          storyboardCatalog[style],
          plan,
          style
        );
        const resolvedUrl =
          dataUrl ??
          createStoryboardPoster(`Style: ${style}`, storyboardCatalog[style], plan, style);
        if (resolvedUrl) {
          const jobEntry = jobs.get(jobId);
          if (jobEntry) {
            jobEntry.result.videoUrls = {
              ...(jobEntry.result.videoUrls || {}),
              [style]: resolvedUrl,
            };
          }
        }
      } catch (error) {
        console.warn('[MuseWave] Failed to generate video preview', style, error);
        const jobEntry = jobs.get(jobId);
        if (jobEntry) {
          jobEntry.result.videoUrls = {
            ...(jobEntry.result.videoUrls || {}),
            [style]: createStoryboardPoster(`Style: ${style}`, storyboardCatalog[style], plan, style),
          };
        }
      }
    })
  );
}

async function createRecordedVideoDataUri(
  duration: number,
  title: string,
  storyboard: string,
  plan: GeneratedPlan | null,
  style: string
) {
  const fallback = () => createStoryboardPoster(title, storyboard, plan, style);

  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return null;
  }

  const canvas = document.createElement('canvas');
  const width = 640;
  const height = 360;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
    return fallback();
  }

  const preferredMimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm;codecs=h264', 'video/webm', 'video/mp4'];

  const supportedMimeType = preferredMimeTypes.find((type) => {
    return (
      typeof MediaRecorder !== 'undefined' &&
      typeof MediaRecorder.isTypeSupported === 'function' &&
      MediaRecorder.isTypeSupported(type)
    );
  });

  let recorder: MediaRecorder;
  let stream: MediaStream | null = null;

  try {
    stream = canvas.captureStream(30);
    recorder = supportedMimeType
      ? new MediaRecorder(stream, { mimeType: supportedMimeType })
      : new MediaRecorder(stream);
  } catch (error) {
    console.warn('[MuseWave] Unable to start MediaRecorder, falling back to storyboard', error);
    stream?.getTracks().forEach((track) => track.stop());
    return fallback();
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const resultPromise = new Promise<string>((resolve) => {
    recorder.onstop = async () => {
      try {
        if (!chunks.length) {
          resolve(fallback());
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType });
        const buffer = await blob.arrayBuffer();
        const base64 = base64FromBytes(new Uint8Array(buffer));
        resolve(`data:${blob.type};base64,${base64}`);
      } catch (error) {
        console.warn('[MuseWave] Failed to encode recorded video, falling back to storyboard', error);
        resolve(fallback());
      } finally {
        stream?.getTracks().forEach((track) => track.stop());
      }
    };

    recorder.onerror = (event) => {
      console.warn('[MuseWave] MediaRecorder error, falling back to storyboard', event);
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
      stream?.getTracks().forEach((track) => track.stop());
      resolve(fallback());
    };
  });

  const palette = getStylePalette(style);
  const sections = plan?.sections ?? [];
  const barsPerSection = Math.max(1, plan?.bars_per_section ?? 8);
  const totalBars = Math.max(1, sections.length * barsPerSection);
  const chordsBySection = sections.map((section) => {
    const chords = plan?.chord_progressions?.[section] ?? [];
    return chords.length ? chords : fallbackProgressionForKey(plan?.key ?? 'C');
  });
  const chordsFlattened = chordsBySection.flat();
  const energyMap = new Map(plan?.energy_curve?.map((entry) => [entry.section, entry.level]) ?? []);
  const lyricLine =
    plan?.lyrics_lines?.find((line) => line.section && line.section.toLowerCase().includes('chorus'))?.text ??
    plan?.lyrics_lines?.[0]?.text ??
    storyboard ??
    'Visual pulse locked to the beat.';
  const firstEnergy = sections.length ? energyMap.get(sections[0]) ?? 60 : 60;
  const lastEnergy = sections.length ? energyMap.get(sections[sections.length - 1]) ?? firstEnergy : firstEnergy;

  const maxDurationMs = Math.min(Math.max(duration, 4), 10) * 1000;

  const wrappedText = wrapStoryboardText(storyboard, 70);

  const drawFrame = (progress: number) => {
    if (!ctx) {
      return;
    }

    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    const startOffset = (progress * 0.6) % 1;
    gradient.addColorStop(0, palette.gradient[0]);
    gradient.addColorStop(Math.min(1, startOffset + 0.35), palette.gradient[1]);
    gradient.addColorStop(1, palette.gradient[2]);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;

    ctx.fillStyle = palette.panel;
    ctx.fillRect(24, 24, width - 48, height - 48);

    ctx.fillStyle = palette.accent;
    ctx.font = 'bold 28px "Inter", sans-serif';
    ctx.fillText(title, 40, 80);

    ctx.fillStyle = palette.text;
    ctx.font = '18px "Inter", sans-serif';
    wrappedText.forEach((line, index) => {
      ctx.fillText(line, 40, 120 + index * 26);
    });

    const metaTop = 180;
    ctx.fillStyle = palette.textSoft;
    ctx.font = '14px "Inter", sans-serif';
    ctx.fillText(`Key: ${plan?.key ?? 'C'} • BPM: ${plan?.bpm ?? 120}`, 40, metaTop);
    ctx.fillText(`Energy: ${Math.round(firstEnergy)}% → ${Math.round(lastEnergy)}%`, 40, metaTop + 20);
    ctx.fillText(`Lyric cue: ${lyricLine.slice(0, 42)}`, 40, metaTop + 40);

    const timelineX = 48;
    const timelineWidth = width - 96;
    const timelineY = height - 96;
    const timelineHeight = 48;

    ctx.fillStyle = palette.timelineBackground;
    ctx.fillRect(timelineX, timelineY, timelineWidth, timelineHeight);

    const segmentWidth = timelineWidth / Math.max(1, sections.length);

    sections.forEach((section, index) => {
      const startX = timelineX + index * segmentWidth;
      const segmentEnergy = energyMap.get(section) ?? 60;
      const energyRatio = Math.min(1, Math.max(0, segmentEnergy / 100));
      const heightOffset = energyRatio * (timelineHeight - 12);

      ctx.fillStyle = palette.timelineFill;
      ctx.fillRect(startX + 4, timelineY + timelineHeight - heightOffset - 8, segmentWidth - 8, heightOffset);

      ctx.fillStyle = palette.textSoft;
      ctx.font = '12px "Inter", sans-serif';
      ctx.fillText(section, startX + 6, timelineY + timelineHeight - 4);
    });

    const barWidth = timelineWidth;
    const barHeight = 10;
    const barY = height - 32;
    ctx.fillStyle = palette.barBackground;
    ctx.fillRect(timelineX, barY, barWidth, barHeight);
    ctx.fillStyle = palette.accent;
    ctx.fillRect(timelineX, barY, barWidth * progress, barHeight);

    if (totalBars > 0 && sections.length > 0) {
      const currentBar = Math.min(totalBars - 1, Math.floor(progress * totalBars));
      const sectionIndex = Math.min(sections.length - 1, Math.floor(currentBar / barsPerSection));
      const barProgress = (progress * totalBars) % 1;
      const stepProgress = (currentBar + barProgress) / totalBars;
      const currentSectionName = sections[sectionIndex] ?? 'Section';
      const chordSymbol =
        chordsFlattened.length > 0 ? chordsFlattened[currentBar % chordsFlattened.length] : '---';
      ctx.fillStyle = palette.highlight;
      ctx.font = 'bold 20px "Inter", sans-serif';
      ctx.fillText(`${currentSectionName} — ${chordSymbol}`, 40, height - 52);

      const cursorX = timelineX + barWidth * stepProgress;
      ctx.fillStyle = palette.accent;
      ctx.fillRect(cursorX - 2, timelineY, 4, timelineHeight + 24);
    }
  };

  if (
    typeof window === 'undefined' ||
    typeof window.requestAnimationFrame === 'undefined' ||
    typeof performance === 'undefined'
  ) {
    stream?.getTracks().forEach((track) => track.stop());
    return fallback();
  }

  const startTime = performance.now();
  let animationFrame = 0;

  const step = () => {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(1, elapsed / maxDurationMs);
    drawFrame(progress);

    if (progress < 1) {
      animationFrame = window.requestAnimationFrame(step);
    } else {
      try {
        recorder.stop();
      } catch (error) {
        console.warn('[MuseWave] Failed to stop MediaRecorder', error);
      }
    }
  };

  recorder.start(200);
  animationFrame = window.requestAnimationFrame(step);

  const result = await resultPromise;
  window.cancelAnimationFrame(animationFrame);
  stream?.getTracks().forEach((track) => track.stop());
  return result;
}

function wrapStoryboardText(text: string, maxCharsPerLine: number) {
  const words = (text || 'Visualizing the beat with vibrant motion graphics.').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 5);
}

function createStoryboardPoster(
  title: string,
  storyboard: string,
  plan: GeneratedPlan | null,
  style: string
) {
  const palette = getStylePalette(style);
  const safeTitle = escapeForSvg(title || 'MuseWave Storyboard');
  const storyLines = wrapStoryboardText(
    storyboard ||
      'Dynamic neon typography synchronized with the beat and pulses of light tracing the melody.',
    38
  );

  const metaLine = plan
    ? `Key ${plan.key ?? 'C'} • ${plan.bpm ?? 120} BPM • ${plan.genre ?? 'Electronic'}`
    : 'MuseWave generative mix preview';
  const sectionsLine = plan?.sections?.slice(0, 4).join(' → ') ?? 'Intro → Verse → Chorus → Outro';

  const energyCurve = plan?.energy_curve ?? [];
  const energyBars = energyCurve
    .map((entry, index) => {
      const energy = Math.min(100, Math.max(0, entry.level ?? 60));
      const width = 520 / Math.max(1, energyCurve.length);
      const height = (energy / 100) * 80;
      const x = 60 + index * width;
      const y = 260 - height;
      return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${Math.max(6, width - 12).toFixed(
        2
      )}" height="${height.toFixed(2)}" rx="6" fill="${palette.timelineFill}" />`;
    })
    .join('');

  const storyText = storyLines
    .map(
      (line, index) =>
        `<tspan x="40" dy="${index === 0 ? 0 : 28}">${escapeForSvg(line)}</tspan>`
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.gradient[0]}"/>
      <stop offset="50%" stop-color="${palette.gradient[1]}"/>
      <stop offset="100%" stop-color="${palette.gradient[2]}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="${palette.background}"/>
  <rect x="24" y="24" width="592" height="312" rx="18" fill="url(#bg)" opacity="0.45"/>
  <rect x="36" y="36" width="568" height="288" rx="16" fill="${palette.panel}" opacity="0.95"/>
  <text x="40" y="84" font-size="28" font-weight="700" fill="${palette.accent}" font-family="Inter, Helvetica, Arial, sans-serif">${safeTitle}</text>
  <text x="40" y="124" font-size="20" fill="${palette.text}" font-family="Inter, Helvetica, Arial, sans-serif">${escapeForSvg(metaLine)}</text>
  <text x="40" y="152" font-size="14" fill="${palette.textSoft}" font-family="Inter, Helvetica, Arial, sans-serif">${escapeForSvg(sectionsLine)}</text>
  <text x="40" y="194" font-size="18" fill="${palette.text}" font-family="Inter, Helvetica, Arial, sans-serif">${storyText}</text>
  <g opacity="0.92">${energyBars}</g>
  <text x="40" y="304" font-size="14" fill="${palette.textSoft}" font-family="Inter, Helvetica, Arial, sans-serif">Energy arc</text>
  <rect x="48" y="312" width="544" height="12" rx="6" fill="${palette.barBackground}"/>
  <rect x="48" y="312" width="240" height="12" rx="6" fill="${palette.accent}"/>
</svg>`;

  return `data:image/svg+xml;base64,${encodeBase64(svg)}`;
}

function escapeForSvg(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function base64FromBytes(bytes: Uint8Array) {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return window.btoa(binary);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  throw new Error('Binary to base64 conversion is not supported in this environment');
}

function createMusicWavDataUri(plan: GeneratedPlan | null, requestedDuration: number, lyrics: string) {
  const bpm = plan?.bpm ?? 120;
  const duration = Math.min(Math.max(requestedDuration || plan?.duration_sec || 90, 20), 60);
  const safeDuration = Number.isFinite(duration) ? duration : 60;

  if (!plan) {
    return createLegacyMusicWavDataUri(safeDuration, bpm, lyrics);
  }

  const sampleRate = 22050;
  const totalSamples = Math.max(1, Math.floor(sampleRate * safeDuration));
  const mixBuffer = new Float32Array(totalSamples);
  const timeline = buildTimeline(plan, safeDuration, sampleRate, bpm);

  if (!timeline.length) {
    return createLegacyMusicWavDataUri(safeDuration, bpm, lyrics);
  }

  const seed =
    hashString(`${plan.title}-${plan.key}-${lyrics}-${bpm}`) ||
    hashString(`${lyrics}-${bpm}`) ||
    1;
  const rng = mulberry32(seed);
  const energyLookup = new Map(plan.energy_curve?.map((entry) => [entry.section, entry.level]) ?? []);

  timeline.forEach((event, index) => {
    const rawChord = event.chord?.trim();
    const fallback = fallbackProgressionForKey(plan.key ?? 'C');
    const chordSymbol = rawChord && rawChord.length ? rawChord : fallback[index % fallback.length];
    const chordSpectrum = getChordSpectrum(chordSymbol);
    const energy = energyLookup.get(event.section) ?? energyLookup.get('Chorus') ?? 65;
    const normalizedEnergy = Math.min(1, Math.max(0, energy / 100));

    layPadLayer(mixBuffer, event, chordSpectrum.pad, normalizedEnergy, sampleRate, rng);
    layBassLayer(mixBuffer, event, chordSpectrum.root, normalizedEnergy, sampleRate, bpm);
    layArpLayer(mixBuffer, event, chordSpectrum.arp, normalizedEnergy, sampleRate, rng);
    layPercussion(mixBuffer, event, bpm, normalizedEnergy, sampleRate, rng);

    if (index % 3 === 0) {
      addAmbientPluck(mixBuffer, event, chordSpectrum.arp, sampleRate, rng);
    }
  });

  applyEcho(mixBuffer, sampleRate, 0.27, 0.24);
  applyEcho(mixBuffer, sampleRate, 0.41, 0.18);

  let peak = 0;
  for (let i = 0; i < mixBuffer.length; i++) {
    const saturated = Math.tanh(mixBuffer[i] * 1.25);
    mixBuffer[i] = saturated;
    const abs = Math.abs(saturated);
    if (abs > peak) {
      peak = abs;
    }
  }

  const normalizer = peak > 0 ? 0.9 / peak : 0.9;
  const byteLength = totalSamples * 2;
  const buffer = new ArrayBuffer(44 + byteLength);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + byteLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, byteLength, true);

  const dataOffset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const value = Math.max(-1, Math.min(1, mixBuffer[i] * normalizer));
    view.setInt16(dataOffset + i * 2, value * 0x7fff, true);
  }

  const base64 = base64FromBytes(new Uint8Array(buffer));
  return `data:audio/wav;base64,${base64}`;
}

function createLegacyMusicWavDataUri(duration: number, bpm: number, lyrics: string) {
  const clampedDuration = Math.min(Math.max(duration, 6), 24);
  const sampleRate = 22050;
  const totalSamples = Math.floor(sampleRate * clampedDuration);
  const channels = 1;
  const bytesPerSample = 2;
  const dataSize = totalSamples * channels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const dataOffset = 44;
  const toneSeed = hashString(`${lyrics}-${bpm}`);
  const baseFreq = 220 + (toneSeed % 120);
  const fifthFreq = baseFreq * 1.5;
  const bassFreq = baseFreq / 2;
  const swing = bpm / 60;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.pow(Math.sin((Math.PI * i) / totalSamples), 1.6);
    const modulator = Math.sin(2 * Math.PI * swing * t) * 0.3;
    const sample =
      Math.sin(2 * Math.PI * baseFreq * t + modulator) * 0.35 +
      Math.sin(2 * Math.PI * fifthFreq * t) * 0.22 +
      Math.sin(2 * Math.PI * bassFreq * t) * 0.18;

    const value = Math.max(-1, Math.min(1, sample * envelope));
    view.setInt16(dataOffset + i * 2, value * 0x7fff, true);
  }

  const base64 = base64FromBytes(new Uint8Array(buffer));
  return `data:audio/wav;base64,${base64}`;
}

function writeString(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function buildTimeline(plan: GeneratedPlan, duration: number, sampleRate: number, bpm: number) {
  const beatsPerBar = 4;
  const barsPerSection = Math.max(1, plan.bars_per_section || 8);
  const totalBars = Math.max(1, plan.sections.length * barsPerSection);
  const secondsPerBeat = 60 / Math.max(30, Math.min(220, bpm));
  const estimatedPlanDuration = totalBars * beatsPerBar * secondsPerBeat;
  const scale = duration / estimatedPlanDuration || 1;
  const samplesPerBar = Math.floor(sampleRate * secondsPerBeat * beatsPerBar * scale);

  const timeline: TimelineEvent[] = [];
  let barIndex = 0;

  plan.sections.forEach((section) => {
    const chords = plan.chord_progressions?.[section] || [];
    for (let localBar = 0; localBar < barsPerSection; localBar++) {
      const chord = chords.length ? chords[localBar % chords.length] : '';
      const startSample = Math.floor(barIndex * samplesPerBar);
      const durationSamples = Math.max(samplesPerBar, 1);
      timeline.push({
        startSample,
        durationSamples,
        chord,
        section,
        bar: localBar,
      });
      barIndex += 1;
    }
  });

  return timeline;
}

function fallbackProgressionForKey(key: string) {
  const normalized = key.trim().toUpperCase();
  const progressions: Record<string, string[]> = {
    C: ['Cmaj7', 'Am7', 'Fmaj7', 'G7'],
    G: ['Gmaj7', 'Em7', 'Cmaj7', 'D7'],
    D: ['Dmaj7', 'Bm7', 'Gmaj7', 'A7'],
    A: ['Amaj7', 'F#m7', 'Dmaj7', 'E7'],
    E: ['Emaj7', 'C#m7', 'Amaj7', 'B7'],
    F: ['Fmaj7', 'Dm7', 'Bbmaj7', 'C7'],
    Bb: ['Bbmaj7', 'Gm7', 'Ebmaj7', 'F7'],
    Eb: ['Ebmaj7', 'Cm7', 'Abmaj7', 'Bb7'],
  };
  const keyName = normalized.replace(/[^A-G#B]/g, '');
  return progressions[keyName] || progressions.C;
}

function getChordSpectrum(symbol: string) {
  const parsed = parseChordSymbol(symbol);
  const baseMidi = parsed.midi;
  const padFrequencies = parsed.intervalsPad.map((steps) => midiToFreq(baseMidi + steps));
  const arpFrequencies = parsed.intervalsArp.map((steps) => midiToFreq(baseMidi + steps));
  const rootFrequency = midiToFreq(baseMidi - 12);
  return { root: rootFrequency, pad: padFrequencies, arp: arpFrequencies };
}

function parseChordSymbol(symbol: string) {
  const match = symbol.trim().match(/^([A-Ga-g])(#{1}|b{1})?(.*)$/);
  if (!match) {
    return {
      midi: 60,
      intervalsPad: [0, 4, 7, 11],
      intervalsArp: [0, 4, 7, 12],
    };
  }

  const [, letter, accidental = '', qualityRaw = ''] = match;
  const noteBase: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };

  const rootSteps = (noteBase[letter.toUpperCase()] ?? 0) + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
  const quality = qualityRaw.toLowerCase();
  const isMinor = quality.startsWith('m') && !quality.startsWith('maj');

  const baseTriad = isMinor ? [0, 3, 7] : [0, 4, 7];
  const hasSeventh = quality.includes('7');
  const isMajorSeventh = quality.includes('maj7');

  const padIntervals = [...baseTriad];
  const arpIntervals = [...baseTriad];

  if (hasSeventh) {
    padIntervals.push(isMajorSeventh ? 11 : 10);
    arpIntervals.push(isMajorSeventh ? 11 : 10);
  }

  if (!quality.includes('sus')) {
    padIntervals.push(isMinor ? 14 : 16); // add color tone (9 or 10)
  }

  arpIntervals.push(12); // octave reinforcement

  const midi = 60 + ((rootSteps + 12) % 12);
  return {
    midi,
    intervalsPad: padIntervals,
    intervalsArp: arpIntervals,
  };
}

function midiToFreq(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function layPadLayer(
  buffer: Float32Array,
  event: TimelineEvent,
  frequencies: number[],
  energy: number,
  sampleRate: number,
  rng: () => number
) {
  if (!frequencies.length) return;
  const start = event.startSample;
  const end = Math.min(buffer.length, start + event.durationSamples);
  const amplitude = 0.08 + energy * 0.18;
  const detuneFactor = 0.995 + rng() * 0.01;

  for (let i = start; i < end; i++) {
    const t = (i - start) / event.durationSamples;
    const env = smoothStep(t) * (1 - smoothStep(Math.max(0, t - 0.6) / 0.4));
    let sample = 0;
    frequencies.forEach((freq, index) => {
      const detune = index === 0 ? 1 : detuneFactor + (index * 0.002 - 0.003);
      const phase = (2 * Math.PI * freq * detune * (i - start)) / sampleRate;
      sample += Math.sin(phase) * (index === 0 ? 0.5 : 0.3);
    });
    buffer[i] += sample * amplitude * env;
  }
}

function layBassLayer(
  buffer: Float32Array,
  event: TimelineEvent,
  rootFrequency: number,
  energy: number,
  sampleRate: number,
  bpm: number
) {
  const start = event.startSample;
  const end = Math.min(buffer.length, start + event.durationSamples);
  const amplitude = 0.12 + energy * 0.22;
  const secondsPerBeat = 60 / Math.max(30, Math.min(220, bpm));
  const beatSamples = Math.max(1, Math.floor(sampleRate * secondsPerBeat));

  for (let i = start; i < end; i++) {
    const t = (i - start) / event.durationSamples;
    const pulse = Math.sin(Math.PI * Math.pow(t, 0.85)) ** 2;
    const phase = (2 * Math.PI * rootFrequency * (i - start)) / sampleRate;
    let sample = Math.sin(phase) * (0.7 + 0.3 * Math.sin(phase * 0.5));
    if (beatSamples > 0 && ((i - start) % beatSamples) < beatSamples * 0.12) {
      sample += Math.sin(phase * 0.5) * 0.8;
    }
    buffer[i] += sample * amplitude * pulse * (0.6 + energy * 0.4);
  }
}

function layArpLayer(
  buffer: Float32Array,
  event: TimelineEvent,
  frequencies: number[],
  energy: number,
  sampleRate: number,
  rng: () => number
) {
  if (!frequencies.length) return;
  const start = event.startSample;
  const end = Math.min(buffer.length, start + event.durationSamples);
  const arpPattern = [0, 2, 1, 3];
  const stepDuration = Math.max(1, Math.floor(event.durationSamples / (arpPattern.length * 4)));
  const amplitude = 0.05 + energy * 0.14;

  for (let i = start; i < end; i++) {
    const stepIndex = Math.floor((i - start) / stepDuration);
    const freqIndex = arpPattern[stepIndex % arpPattern.length] % frequencies.length;
    const freq = frequencies[freqIndex] * (0.99 + rng() * 0.02);
    const local = (i - start) % stepDuration;
    const env = Math.sin((Math.PI * local) / stepDuration) ** 1.5;
    const phase = (2 * Math.PI * freq * local) / sampleRate;
    buffer[i] += Math.sin(phase) * amplitude * env;
  }
}

function layPercussion(
  buffer: Float32Array,
  event: TimelineEvent,
  bpm: number,
  energy: number,
  sampleRate: number,
  rng: () => number
) {
  const beatsPerBar = 4;
  const secondsPerBeat = 60 / bpm;
  const samplesPerBeat = Math.max(1, Math.floor(sampleRate * secondsPerBeat));
  const start = event.startSample;

  for (let beat = 0; beat < beatsPerBar; beat++) {
    const sampleIndex = start + beat * samplesPerBeat;
    if (beat === 0) {
      addKick(buffer, sampleIndex, sampleRate, energy);
    } else if (beat === 2) {
      addSnare(buffer, sampleIndex, sampleRate, energy, rng);
    }
    for (let sub = 0; sub < 2; sub++) {
      const hatIndex = sampleIndex + Math.floor(sub * samplesPerBeat * 0.5);
      addHat(buffer, hatIndex, sampleRate, energy, rng);
    }
  }
}

function addKick(buffer: Float32Array, index: number, sampleRate: number, energy: number) {
  const length = Math.floor(sampleRate * 0.25);
  for (let i = 0; i < length; i++) {
    const pos = index + i;
    if (pos >= buffer.length) break;
    const t = i / sampleRate;
    const env = Math.exp(-t * 18);
    const freq = 110 * Math.exp(-t * 4);
    const sample = Math.sin(2 * Math.PI * freq * t) * env * (0.5 + energy * 0.5);
    buffer[pos] += sample;
  }
}

function addSnare(
  buffer: Float32Array,
  index: number,
  sampleRate: number,
  energy: number,
  rng: () => number
) {
  const length = Math.floor(sampleRate * 0.22);
  for (let i = 0; i < length; i++) {
    const pos = index + i;
    if (pos >= buffer.length) break;
    const t = i / sampleRate;
    const env = Math.exp(-t * 14);
    const tone = Math.sin(2 * Math.PI * 200 * t) * 0.3;
    const noise = (rng() * 2 - 1) * env * 0.5;
    buffer[pos] += (tone + noise) * (0.5 + energy * 0.5);
  }
}

function addHat(buffer: Float32Array, index: number, sampleRate: number, energy: number, rng: () => number) {
  const length = Math.floor(sampleRate * 0.08);
  for (let i = 0; i < length; i++) {
    const pos = index + i;
    if (pos >= buffer.length) break;
    const t = i / length;
    const env = Math.exp(-t * 6);
    const noise = (rng() * 2 - 1) * env;
    buffer[pos] += noise * (0.2 + energy * 0.18);
  }
}

function addAmbientPluck(
  buffer: Float32Array,
  event: TimelineEvent,
  frequencies: number[],
  sampleRate: number,
  rng: () => number
) {
  if (!frequencies.length) return;
  const start = event.startSample;
  const duration = Math.min(event.durationSamples, Math.floor(sampleRate * 0.9));
  const freq = frequencies[rng() * frequencies.length | 0];
  const phaseOffset = rng() * Math.PI;
  for (let i = 0; i < duration; i++) {
    const pos = start + i;
    if (pos >= buffer.length) break;
    const t = i / duration;
    const env = Math.pow(Math.sin(Math.PI * t), 2);
    const sample =
      Math.sin((2 * Math.PI * freq * i) / sampleRate + phaseOffset) * env * 0.08 +
      Math.sin((2 * Math.PI * freq * 0.5 * i) / sampleRate + phaseOffset) * env * 0.04;
    buffer[pos] += sample;
  }
}

function applyEcho(buffer: Float32Array, sampleRate: number, delaySeconds: number, feedback: number) {
  const delaySamples = Math.max(1, Math.floor(sampleRate * delaySeconds));
  for (let i = delaySamples; i < buffer.length; i++) {
    buffer[i] += buffer[i - delaySamples] * feedback;
  }
}

function smoothStep(t: number) {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getStylePalette(style: string) {
  const normalized = (style || '').toLowerCase();
  const palettes: Record<
    string,
    {
      background: string;
      panel: string;
      gradient: [string, string, string];
      accent: string;
      highlight: string;
      text: string;
      textSoft: string;
      timelineBackground: string;
      timelineFill: string;
      barBackground: string;
    }
  > = {
    lyrical: {
      background: '#050816',
      panel: 'rgba(2, 6, 23, 0.92)',
      gradient: ['#38bdf8', '#6366f1', '#818cf8'],
      accent: '#f8fafc',
      highlight: '#38bdf8',
      text: '#e2e8f0',
      textSoft: '#cbd5f5',
      timelineBackground: 'rgba(15, 23, 42, 0.75)',
      timelineFill: '#38bdf8',
      barBackground: '#1e293b',
    },
    official: {
      background: '#070b11',
      panel: 'rgba(10, 12, 21, 0.94)',
      gradient: ['#0ea5e9', '#0284c7', '#1d4ed8'],
      accent: '#93c5fd',
      highlight: '#38bdf8',
      text: '#e2e8f0',
      textSoft: '#bfdbfe',
      timelineBackground: 'rgba(8, 47, 73, 0.75)',
      timelineFill: '#0ea5e9',
      barBackground: '#0f172a',
    },
    abstract: {
      background: '#040414',
      panel: 'rgba(10, 10, 26, 0.9)',
      gradient: ['#f472b6', '#6366f1', '#22d3ee'],
      accent: '#fdf2f8',
      highlight: '#f472b6',
      text: '#fce7f3',
      textSoft: '#f9a8d4',
      timelineBackground: 'rgba(76, 29, 149, 0.65)',
      timelineFill: '#c084fc',
      barBackground: '#1f1a38',
    },
  };

  const fallback = palettes.lyrical;
  const palette = palettes[normalized] ?? fallback;
  return {
    ...palette,
    gradient: palette.gradient,
    background: palette.background,
    panel: palette.panel,
    accent: palette.accent,
    highlight: palette.highlight,
    text: palette.text,
    textSoft: palette.textSoft,
    timelineBackground: palette.timelineBackground,
    timelineFill: palette.timelineFill,
    barBackground: palette.barBackground,
  };
}

function buildMockPlan(payload: Record<string, unknown>): GeneratedPlan {
  const prompt = typeof payload.musicPrompt === 'string' && payload.musicPrompt.trim()
    ? payload.musicPrompt.trim()
    : 'MuseWave generative composition';
  const durationSec = Math.min(Math.max(Number(payload.duration) || 90, 60), 240);

  const genres = Array.isArray(payload.genres)
    ? (payload.genres as unknown[]).map((value) => String(value)).filter(Boolean)
    : [];

  const artists = Array.isArray(payload.artistInspiration)
    ? (payload.artistInspiration as unknown[]).map((value) => String(value)).filter(Boolean)
    : [];

  const seedSource = `${prompt}-${genres.join(',')}-${artists.join(',')}`;
  const seed = hashString(seedSource || 'musewave');

  const availableSections = [
    'Intro',
    'Verse 1',
    'Pre-Chorus',
    'Chorus',
    'Verse 2',
    'Bridge',
    'Breakdown',
    'Chorus (Final)',
    'Outro',
  ];

  const sectionCount = durationSec > 150 ? 7 : 5;
  const sections = availableSections.slice(0, sectionCount);
  const barsPerSection = durationSec > 150 ? 16 : 8;

  const chordPalettes: string[][] = [
    ['Cm7', 'Ab', 'Eb', 'Gm'],
    ['Dm7', 'G7', 'Cmaj7', 'Am7'],
    ['Fmaj7', 'Dm7', 'Bb', 'C'],
    ['Am7', 'F', 'C', 'G'],
    ['Em7', 'Cmaj7', 'G', 'D'],
  ];

  const chordProgressions = Object.fromEntries(
    sections.map((section, index) => {
      const progression = chordPalettes[(seed + index) % chordPalettes.length];
      return [section, progression];
    })
  );

  const lyricSource =
    typeof payload.lyrics === 'string' && payload.lyrics.trim()
      ? payload.lyrics.trim()
      : createDefaultLyrics(prompt, genres[0]);

  const lyricLines = lyricSource
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const structuredLyrics = sections.flatMap((section, index) => {
    const line = lyricLines.length
      ? lyricLines[index] || lyricLines[index % lyricLines.length]
      : '';
    return line
      .split(/\s*\|\s*/g)
      .map((fragment) => fragment.trim())
      .filter(Boolean)
      .map((fragment) => ({
        section,
        text: fragment,
      }));
  });

  const keys = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb'];
  const key = keys[seed % keys.length];
  const bpm = 90 + (seed % 50);

  return {
    title: prompt.slice(0, 54),
    genre: genres[0] || 'Electronic',
    duration_sec: durationSec,
    bpm,
    key,
    sections,
    bars_per_section: barsPerSection,
    chord_progressions: chordProgressions,
    lyrics_lines: structuredLyrics,
    artist_style_notes: artists.length
      ? artists.map((artist) => `${artist} inspired vocal delivery`)
      : ['Dynamic AI vocal phrasing', 'Glitch-hop inspired harmonies'],
    instrumentation: ['Synth bass', 'Hybrid drum kit', 'Layered pads', 'AI vocals'],
    arrangement_notes: [
      'Start with atmosphere and gradually layer percussion.',
      'Introduce vocals during the first chorus with call-and-response backing harmonies.',
      'Bridge introduces a filtered breakdown before the final drop.',
    ],
    energy_curve: sections.map((section, index) => ({
      section,
      level: Math.round(40 + (index / Math.max(1, sections.length - 1)) * 60),
    })),
  };
}

function createDefaultLyrics(prompt: string, genre: string | undefined) {
  const theme = prompt
    ? prompt.replace(/\s+/g, ' ').split(' ').slice(0, 6).join(' ')
    : 'Lights over the skyline';

  const mood = genre ? genre.toLowerCase() : 'electronic';

  return [
    `${theme}, echo in neon haze`,
    `Chasing ${mood} rhythms across the night`,
    `Voices in circuits, hearts synchronize`,
    `Glowing horizons, we rise and ignite`,
    `Midnight confession under ultraviolet skies`,
  ].join('\n');
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
