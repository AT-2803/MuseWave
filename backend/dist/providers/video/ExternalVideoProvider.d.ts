import { VideoProvider } from './VideoProvider.js';
export declare class ExternalVideoProvider implements VideoProvider {
    private apiUrl;
    private apiKey;
    constructor(apiUrl: string, apiKey: string);
    generateVideo(audioBuffer: Buffer, plan: any, duration: number): Promise<Buffer>;
}
