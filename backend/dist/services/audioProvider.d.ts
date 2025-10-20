export declare class MockAudioProvider {
    generate(planAssetId: string, seed?: number): Promise<{
        readonly stems: {
            readonly drums: string;
            readonly bass: string;
            readonly lead: string;
        };
        readonly previewAssetId: string;
        readonly durationSec: number;
    }>;
}
