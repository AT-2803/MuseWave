export interface AudioProvider {
    generateAudio(plan: any, duration: number): Promise<Buffer>;
}
export declare abstract class BaseAudioProvider implements AudioProvider {
    abstract generateAudio(plan: any, duration: number): Promise<Buffer>;
}
