const BASE_URL = import.meta.env.VITE_ORCHESTRATOR_URL || 'http://localhost:8080';

export type OrchestratorEvent = {
  step?: number;
  label?: string;
  pct?: number;
  status?: string;
  error?: string;
};

export type OrchestratorResult = {
  audioUrl?: string;
  videoUrls?: Record<string, string>;
  plan?: any;
  error?: string;
};

export async function startGeneration(payload: Record<string, unknown>) {
  const resp = await fetch(`${BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Orchestrator error: ${resp.status} ${text}`);
  }

  return resp.json();
}

export function subscribeToJob(jobId: string, onEvent: (event: OrchestratorEvent) => void, onError: (err: any) => void) {
  const es = new EventSource(`${BASE_URL}/api/jobs/${jobId}/events`);
  es.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse SSE message', error);
    }
  };
  es.onerror = (err) => {
    onError(err);
    es.close();
  };
  return es;
}

export async function fetchJobResult(jobId: string): Promise<OrchestratorResult> {
  const resp = await fetch(`${BASE_URL}/api/jobs/${jobId}/result`);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to fetch job result: ${resp.status} ${text}`);
  }
  return resp.json();
}
