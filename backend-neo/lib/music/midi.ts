// Minimal MIDI parser for note on/off, assuming 4/4
export interface MidiNote {
  pitch: number;
  velocity: number;
  time: number;
  duration: number;
}

export function parseMidi(buffer: Buffer): MidiNote[] {
  // Simplified: assume single track, note on/off events
  const notes: MidiNote[] = [];
  let time = 0;
  let i = 0;
  while (i < buffer.length) {
    const delta = buffer.readUInt8(i++);
    time += delta;
    const status = buffer.readUInt8(i++);
    if (status === 0x90) { // Note on
      const pitch = buffer.readUInt8(i++);
      const velocity = buffer.readUInt8(i++);
      if (velocity > 0) {
        notes.push({ pitch, velocity, time, duration: 0 });
      }
    } else if (status === 0x80) { // Note off
      const pitch = buffer.readUInt8(i++);
      buffer.readUInt8(i++); // velocity
      const note = notes.find(n => n.pitch === pitch && n.duration === 0);
      if (note) note.duration = time - note.time;
    }
  }
  return notes;
}

export function midiToTokens(notes: MidiNote[], key: string, scale: 'major' | 'minor'): { degree: number; duration: number }[] {
  const tokens: { degree: number; duration: number }[] = [];
  for (const note of notes) {
    // Map pitch to degree (simplified)
    const degree = (note.pitch - 60) % 12; // C4 = 60
    tokens.push({ degree, duration: note.duration });
  }
  return tokens;
}