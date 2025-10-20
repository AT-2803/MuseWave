const { startGeneration, fetchJobResult } = require('../services/orchestratorClient.cjs');
const fs = require('fs');

function inspectWavBuffer(buf) {
  const view = new DataView(buf.buffer || buf);
  const subchunk2Size = view.getUint32(40, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  return { subchunk2Size, sampleRate, bitsPerSample };
}

async function main() {
  const payload = { musicPrompt: 'Test', duration: 15 };
  const { jobId } = await startGeneration(payload);
  console.log('Started job', jobId);
  const result = await fetchJobResult(jobId);
  if (!result.audioUrl) {
    console.error('No audioUrl in result');
    return;
  }
  const base64 = result.audioUrl.split(',')[1];
  const buf = Buffer.from(base64, 'base64');
  const info = inspectWavBuffer(buf);
  const duration = info.subchunk2Size / (info.sampleRate * (info.bitsPerSample / 8));
  console.log('Orchestrator audio duration (s):', duration);
}

main().catch(console.error);
