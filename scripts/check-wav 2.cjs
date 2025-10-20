const fs = require('fs');

function base64FromUint8Array(uint8arr) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(uint8arr).toString('base64');
  }
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < uint8arr.length; i += chunkSize) {
    const slice = uint8arr.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

function createSilentWavDataUri(durationSec, sampleRate = 44100) {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit PCM
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

  writeString('RIFF'); // ChunkID
  view.setUint32(offset, 36 + dataSize, true); offset += 4; // ChunkSize
  writeString('WAVE'); // Format
  writeString('fmt '); // Subchunk1ID
  view.setUint32(offset, 16, true); offset += 4; // Subchunk1Size
  view.setUint16(offset, 1, true); offset += 2; // AudioFormat (1 = PCM)
  view.setUint16(offset, numChannels, true); offset += 2; // NumChannels
  view.setUint32(offset, sampleRate, true); offset += 4; // SampleRate
  view.setUint32(offset, byteRate, true); offset += 4; // ByteRate
  view.setUint16(offset, blockAlign, true); offset += 2; // BlockAlign
  view.setUint16(offset, bytesPerSample * 8, true); offset += 2; // BitsPerSample
  writeString('data'); // Subchunk2ID
  view.setUint32(offset, dataSize, true); offset += 4; // Subchunk2Size

  const uint8 = new Uint8Array(buffer);
  const base64 = base64FromUint8Array(uint8);
  return `data:audio/wav;base64,${base64}`;
}

function inspectWavBase64(dataUri) {
  const base64 = dataUri.split(',')[1];
  const buf = Buffer.from(base64, 'base64');
  // Subchunk2Size at byte offset 40 (little endian uint32)
  const subchunk2 = buf.readUInt32LE(40);
  const sampleRate = buf.readUInt32LE(24);
  const bitsPerSample = buf.readUInt16LE(34);
  const numChannels = buf.readUInt16LE(22);
  const bytesPerSample = bitsPerSample / 8;
  const duration = subchunk2 / (sampleRate * numChannels * bytesPerSample);
  return { subchunk2, sampleRate, bitsPerSample, numChannels, duration };
}

const durationSec = Number(process.argv[2] || 12);
const uri = createSilentWavDataUri(durationSec);
fs.writeFileSync('test.wav', Buffer.from(uri.split(',')[1], 'base64'));
const info = inspectWavBase64(uri);
console.log('Requested seconds:', durationSec);
console.log('Inspected WAV info:', info);
console.log('test.wav written, size:', fs.statSync('test.wav').size);
