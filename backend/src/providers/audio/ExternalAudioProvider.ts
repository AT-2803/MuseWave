import { AudioProvider } from './AudioProvider.js';

export class ExternalAudioProvider implements AudioProvider {
  constructor(private apiUrl: string, private apiKey: string) {}

  async generateAudio(plan: any, duration: number): Promise<Buffer> {
    // TODO: Implement external API call
    // For now, throw not implemented
    throw new Error('External audio provider not implemented');
  }
}