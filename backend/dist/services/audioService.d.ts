import { MusicPlan } from './planService.js';
export declare class AudioService {
    generateAudio(plan: MusicPlan, duration: number, outputPath: string): Promise<void>;
    private getFrequencyForSection;
    private generateTone;
    private concatenateAudio;
}
export declare const audioService: AudioService;
