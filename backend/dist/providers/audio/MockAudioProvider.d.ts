import { AudioProvider } from './AudioProvider.js';
export declare class MockAudioProvider implements AudioProvider {
    generateAudio(plan: any, duration: number): Promise<Buffer>;
    private generateWithFfmpeg;
    private buildOscillators;
    private getBaseFrequency;
    private generateHarmony;
}
