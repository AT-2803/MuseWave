import { Queue } from '../queue';
import { generateAudioSchema } from '../routes/validators';
import { MockAudioProvider } from '../services/audioProvider';
import { JOB_TYPE } from '../types';

const provider = new MockAudioProvider();

export function registerAudioWorker(queue: Queue) {
  queue.registerWorker({
    type: JOB_TYPE.AUDIO,
    concurrency: 1,
    handler: async ({ params }) => {
      const input = generateAudioSchema.parse(params);
      const payload = await provider.generate(input.planAssetId, input.seed);
      return {
        result: {
          planAssetId: input.planAssetId,
          stems: payload.stems,
          previewAssetId: payload.previewAssetId,
          provider: 'mock-ffmpeg',
        },
        assetId: payload.previewAssetId,
      };
    },
  });
}
