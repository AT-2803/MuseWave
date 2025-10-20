export declare class VideoService {
    generateVideo(audioPath: string, plan: any, outputPath: string): Promise<void>;
    private generateVisuals;
    private combineAudioVideo;
}
export declare const videoService: VideoService;
