export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { musicPrompt, genres, durationSec, artistInspiration } = request.body || {};
  // TODO: Implement full pipeline
  response.status(200).json({ jobId: 'pipeline-job-123', status: 'queued' });
}