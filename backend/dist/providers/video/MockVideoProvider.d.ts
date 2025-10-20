import { VideoProvider } from './VideoProvider.js';
export declare class MockVideoProvider implements VideoProvider {
    generateVideo(audioBuffer: Buffer, plan: any, duration: number): Promise<Buffer>;
    private generateVisuals;
    private combineAudioVideo;
}
