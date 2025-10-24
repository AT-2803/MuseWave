import { query, tx } from './db';
import crypto from 'crypto';

export interface Job {
  id: string;
  type: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  params: any;
  result?: any;
  attempts: number;
  max_attempts: number;
  error?: string;
  parent_id?: string;
  api_key_id?: string;
  progress?: number;
  message?: string;
}

export async function createJob(type: string, params: any, apiKeyId?: string, parentId?: string): Promise<Job> {
  const paramsHash = crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex');
  // Check for existing successful job within 24h
  const res = await query('SELECT * FROM jobs WHERE type = $1 AND params::text = $2 AND status = \'succeeded\' AND created_at > now() - interval \'24 hours\'', [type, JSON.stringify(params)]);
  if (res.rows[0]) return res.rows[0];
  const insertRes = await query('INSERT INTO jobs (type, params, api_key_id, parent_id) VALUES ($1, $2, $3, $4) RETURNING *', [type, JSON.stringify(params), apiKeyId, parentId]);
  return insertRes.rows[0];
}

export async function updateJob(id: string, updates: Partial<Job>): Promise<void> {
  const fields = Object.keys(updates).filter(k => k !== 'id');
  const values = fields.map(k => updates[k as keyof Job]);
  const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  await query(`UPDATE jobs SET ${setClause}, updated_at = now() WHERE id = $1`, [id, ...values]);
}

export async function getJob(id: string): Promise<Job | null> {
  const res = await query('SELECT * FROM jobs WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function processJob(id: string, processor: (job: Job) => Promise<any>): Promise<void> {
  await tx(async (client) => {
    const jobRes = await client.query('SELECT * FROM jobs WHERE id = $1 FOR UPDATE', [id]);
    const job = jobRes.rows[0];
    if (!job || job.status !== 'queued') return;
    await client.query('UPDATE jobs SET status = \'running\', attempts = attempts + 1 WHERE id = $1', [id]);
    try {
      const result = await processor(job);
      await client.query('UPDATE jobs SET status = \'succeeded\', result = $2 WHERE id = $1', [id, JSON.stringify(result)]);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      if (job.attempts >= job.max_attempts) {
        await client.query('UPDATE jobs SET status = \'failed\', error = $2 WHERE id = $1', [id, error]);
      } else {
        await client.query('UPDATE jobs SET status = \'queued\' WHERE id = $1', [id]);
      }
    }
  });
}