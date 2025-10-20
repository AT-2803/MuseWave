export interface VideoProvider {
    generateVideo(audioBuffer: Buffer, plan: any, duration: number): Promise<Buffer>;
}
export declare abstract class BaseVideoProvider implements VideoProvider {
    abstract generateVideo(audioBuffer: Buffer, plan: any, duration: number): Promise<Buffer>;
}
