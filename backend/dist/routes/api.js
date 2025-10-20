import { Router } from 'express';
import { planRequestSchema, generateAudioSchema, generateVocalsSchema, generateMixSchema, generateVideoSchema } from './validators';
import { JOB_TYPE } from '../types';
export function buildApiRouter(queue) {
    const router = Router();
    router.post('/v1/plan', async (req, res) => {
        const parsed = planRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
        }
        const enqueueResult = await queue.enqueue(JOB_TYPE.PLAN, parsed.data, {
            apiKeyId: req.apiKeyRecord?.id,
            parentId: undefined,
        });
        res.json(enqueueResult);
    });
    router.post('/v1/generate/audio', async (req, res) => {
        const parsed = generateAudioSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
        }
        const job = await queue.enqueue(JOB_TYPE.AUDIO, parsed.data, { apiKeyId: req.apiKeyRecord?.id });
        res.json(job);
    });
    router.post('/v1/generate/vocals', async (req, res) => {
        const parsed = generateVocalsSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
        }
        const job = await queue.enqueue(JOB_TYPE.VOCALS, parsed.data, { apiKeyId: req.apiKeyRecord?.id });
        res.json(job);
    });
    router.post('/v1/generate/mix', async (req, res) => {
        const parsed = generateMixSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
        }
        const job = await queue.enqueue(JOB_TYPE.MIX, parsed.data, { apiKeyId: req.apiKeyRecord?.id });
        res.json(job);
    });
    router.post('/v1/generate/video', async (req, res) => {
        const parsed = generateVideoSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
        }
        const job = await queue.enqueue(JOB_TYPE.VIDEO, parsed.data, { apiKeyId: req.apiKeyRecord?.id });
        res.json(job);
    });
    return router;
}
