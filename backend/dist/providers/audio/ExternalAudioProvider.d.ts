import { AudioProvider } from './AudioProvider.js';
export declare class ExternalAudioProvider implements AudioProvider {
    private apiUrl;
    private apiKey;
    constructor(apiUrl: string, apiKey: string);
    generateAudio(plan: any, duration: number): Promise<Buffer>;
}
