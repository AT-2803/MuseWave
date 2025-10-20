export interface Caption {
    start: number;
    end: number;
    text: string;
}
export declare class CaptionGenerator {
    generateCaptions(plan: any, duration: number): Caption[];
    private generateCaptionText;
    toSRT(captions: Caption[]): string;
    toVTT(captions: Caption[]): string;
    private formatTime;
}
export declare const captionGenerator: CaptionGenerator;
