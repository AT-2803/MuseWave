import type { VideoStyle } from '../lib/types';

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

export async function startGeneration(payload: Record<string, unknown>) {
  // Call real backend-neo API
  const response = await fetch('/api/generate/pipeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Generation failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  return { 
    jobId: data.jobId, 
    plan: data.plan || null 
  };
}

export function subscribeToJob(
  jobId: string,
  onEvent: (event: OrchestratorEvent) => void,
  onError: (err: any) => void
) {
  let polling = true;
  let pollCount = 0;
  const maxPolls = 300; // 10 minutes at 2s intervals
  
  const poll = async () => {
    if (!polling || pollCount >= maxPolls) {
      if (pollCount >= maxPolls) {
        onError(new Error('Job polling timeout after 10 minutes'));
      }
      return;
    }
    
    pollCount++;
    
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error(`Job fetch failed: ${response.statusText}`);
      }
      
      const job = await response.json();
      
      // Map backend status to frontend with accurate progress
      if (job.status === 'succeeded') {
        onEvent({ status: 'complete', pct: 100, label: 'Complete! 🎉' });
        polling = false;
      } else if (job.status === 'failed') {
        onEvent({ status: 'error', error: job.error || 'Generation failed' });
        polling = false;
      } else if (job.status === 'running') {
        // Use backend progress and message if available
        const progress = job.progress || Math.min(95, Math.floor((pollCount / 30) * 100));
        const message = job.message || 'Generating audio stems...';
        onEvent({ 
          status: 'generating-instruments', 
          pct: progress,
          label: message
        });
        setTimeout(poll, 2000);
      } else if (job.status === 'pending' || job.status === 'queued') {
        onEvent({ 
          status: 'planning', 
          pct: 5,
          label: job.message || 'Queued for processing...'
        });
        setTimeout(poll, 2000);
      } else {
        onEvent({ 
          status: job.status, 
          pct: job.progress || 25,
          label: job.message || 'Processing...'
        });
        setTimeout(poll, 2000);
      }
    } catch (err) {
      console.error('Job polling error:', err);
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
  try {
    const response = await fetch(`/api/jobs/${jobId}`);
    if (!response.ok) {
      return { error: `Fetch failed: ${response.statusText}` };
    }
    
    const job = await response.json();
    
    if (job.status === 'succeeded') {
      return {
        audioUrl: job.result?.audio ? `/api/assets/${job.result.audio}` : null,
        videoUrls: job.result?.video ? { 
          [job.videoStyle || 'default']: `/api/assets/${job.result.video}` 
        } : null,
        plan: job.result?.plan || null,
      };
    } else if (job.status === 'failed') {
      return { error: job.error || 'Generation failed' };
    } else {
      return { error: 'Job not complete' };
    }
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Failed to fetch job result' 
    };
  }
}
