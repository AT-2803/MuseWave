#!/usr/bin/env node
const fs = require('fs');

function base64FromUint8Array(uint8arr) {
  if (typeof Buffer !== 'undefined') return Buffer.from(uint8arr).toString('base64');
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < uint8arr.length; i += chunkSize) {
    const slice = uint8arr.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  if (typeof btoa === 'function') return btoa(binary);
  throw new Error('No base64 encoder available');
}

function createSilentWavDataUri(durationSec, sampleRate = 44100) {
  const numChannels = 1;
  const bytesPerSample = 2;
  const numSamples = Math.max(0, Math.floor(durationSec * sampleRate));
  const dataSize = numSamples * numChannels * bytesPerSample;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;
  function writeString(str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset, str.charCodeAt(i));
      offset++;
    }
  }

  writeString('RIFF');
  view.setUint32(offset, 36 + dataSize, true); offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, numChannels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, blockAlign, true); offset += 2;
  view.setUint16(offset, bytesPerSample * 8, true); offset += 2;
  writeString('data');
  view.setUint32(offset, dataSize, true); offset += 4;

  // PCM data remains zeros
  const uint8 = new Uint8Array(buffer);
  const base64 = base64FromUint8Array(uint8);
  return `data:audio/wav;base64,${base64}`;
}

function inspectWavBuffer(buf) {
  const view = new DataView(buf.buffer || buf);
  // ChunkSize at offset 4
  const chunkSize = view.getUint32(4, true);
  const format = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  const subchunk2Size = view.getUint32(40, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  return { chunkSize, format, subchunk2Size, sampleRate, bitsPerSample };
}

function main() {
  const arg = Number(process.argv[2] || 30);
  const dur = Math.max(0, Math.floor(arg));
  console.log('Generating silent WAV for', dur, 'seconds...');
  const dataUri = createSilentWavDataUri(dur);
  const base64 = dataUri.split(',')[1];
  const buf = Buffer.from(base64, 'base64');
  const info = inspectWavBuffer(buf);
  console.log('WAV header info:', info);
  const computedDuration = info.subchunk2Size / (info.sampleRate * (info.bitsPerSample / 8));
  console.log('Computed duration (s):', computedDuration);
  const outPath = `./test-${dur}s.wav`;
  fs.writeFileSync(outPath, buf);
  console.log('WAV written to', outPath, 'size', buf.length);
}

main();
