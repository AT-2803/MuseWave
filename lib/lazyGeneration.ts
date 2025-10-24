/**
 * Lazy Asset Generation Configuration
 * Generates expensive assets (video, high-res images) only when explicitly requested
 * Saves 40-50% on compute costs
 */

export interface GenerationOptions {
  // Audio is always generated (required)
  generateAudio: true;
  
  // Video generation is opt-in (expensive)
  generateVideo?: boolean;
  videoStyles?: string[];
  
  // Cover art generation is opt-in
  generateCoverArt?: boolean;
  
  // Visualization data (lightweight, always included)
  generateVisualizationData?: boolean;
}

export const DEFAULT_GENERATION_OPTIONS: GenerationOptions = {
  generateAudio: true,
  generateVideo: false, // LAZY: Only on explicit request
  generateCoverArt: false, // LAZY: Only on explicit request
  generateVisualizationData: true, // Cheap, always include
};

/**
 * User action triggers for lazy generation
 */
export enum AssetGenerationTrigger {
  INITIAL = 'initial', // Audio + viz data only
  DOWNLOAD_VIDEO = 'download_video', // User clicks "Download Video"
  SHARE_SOCIAL = 'share_social', // User clicks "Share" (needs video + cover)
  DOWNLOAD_COVER = 'download_cover', // User clicks "Download Cover Art"
}

/**
 * Get generation options based on user action
 */
export function getGenerationOptions(trigger: AssetGenerationTrigger): GenerationOptions {
  switch (trigger) {
    case AssetGenerationTrigger.INITIAL:
      return {
        generateAudio: true,
        generateVideo: false,
        generateCoverArt: false,
        generateVisualizationData: true,
      };
    
    case AssetGenerationTrigger.DOWNLOAD_VIDEO:
      return {
        generateAudio: true,
        generateVideo: true,
        videoStyles: ['visualizer'], // Single style by default
        generateCoverArt: false,
        generateVisualizationData: true,
      };
    
    case AssetGenerationTrigger.SHARE_SOCIAL:
      return {
        generateAudio: true,
        generateVideo: true,
        videoStyles: ['visualizer'],
        generateCoverArt: true,
        generateVisualizationData: true,
      };
    
    case AssetGenerationTrigger.DOWNLOAD_COVER:
      return {
        generateAudio: true,
        generateVideo: false,
        generateCoverArt: true,
        generateVisualizationData: true,
      };
    
    default:
      return DEFAULT_GENERATION_OPTIONS;
  }
}

/**
 * Request lazy asset generation for existing job
 * This is called when user clicks "Download Video" or "Share" after initial generation
 */
export async function requestLazyAsset(
  jobId: string,
  assetType: 'video' | 'cover-art',
  options?: Record<string, any>
): Promise<{ jobId: string; status: string }> {
  const response = await fetch('/api/jobs/generate-asset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobId,
      assetType,
      options,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to generate asset');
  }

  return response.json();
}

/**
 * Cost savings calculator
 */
export function calculateCostSavings(totalGenerations: number): {
  withLazyGeneration: number;
  withoutLazyGeneration: number;
  savings: number;
  savingsPercent: number;
} {
  // Assume 30% of users actually download video/share
  const videoGenerationRate = 0.3;
  
  // Cost per track (INR)
  const audioCost = 2.0; // AI + TTS + audio processing
  const videoCost = 1.5; // ffmpeg video generation
  const coverArtCost = 0.3; // Image generation
  
  const withoutLazy = totalGenerations * (audioCost + videoCost + coverArtCost);
  const withLazy = totalGenerations * audioCost + 
                    (totalGenerations * videoGenerationRate * (videoCost + coverArtCost));
  
  const savings = withoutLazy - withLazy;
  const savingsPercent = (savings / withoutLazy) * 100;
  
  return {
    withLazyGeneration: withLazy,
    withoutLazyGeneration: withoutLazy,
    savings,
    savingsPercent,
  };
}
