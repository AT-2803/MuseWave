export interface MixInputs {
    audio?: string;
    vocals?: string;
    background?: string;
}
export declare class MixService {
    mixTracks(inputs: MixInputs, outputPath: string): Promise<void>;
    private runFfmpeg;
}
export declare const mixService: MixService;
