import { VideoProvider } from './VideoProvider.js';

export class ExternalVideoProvider implements VideoProvider {
  constructor(private apiUrl: string, private apiKey: string) {}

  async generateVideo(audioBuffer: Buffer, plan: any, duration: number): Promise<Buffer> {
    // TODO: Implement external API call
    throw new Error('External video provider not implemented');
  }
}