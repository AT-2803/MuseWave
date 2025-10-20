export declare class VocalService {
    generateVocals(plan: any, duration: number, outputPath: string): Promise<void>;
    private generateMelody;
    private synthesizeMelody;
    private generateTone;
    private concatenateAudio;
}
export declare const vocalService: VocalService;
