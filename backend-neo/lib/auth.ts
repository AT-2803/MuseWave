import { query, tx } from './db';
import crypto from 'crypto';

export interface ApiKey {
  id: string;
  key: string;
  owner: string;
  rate_limit_per_min: number;
  disabled_at?: Date;
}

export async function getApiKey(key: string): Promise<ApiKey | null> {
  const res = await query('SELECT * FROM api_keys WHERE key = $1 AND disabled_at IS NULL', [key]);
  return res.rows[0] || null;
}

export async function checkRateLimit(apiKeyId: string, rateLimit: number): Promise<boolean> {
  const now = Date.now();
  const windowStart = Math.floor(now / 60000) * 60000; // 1-minute windows
  const res = await query('SELECT tokens FROM rate_counters WHERE api_key_id = $1 AND window_start_ms = $2', [apiKeyId, windowStart]);
  const current = res.rows[0]?.tokens || 0;
  if (current >= rateLimit) return false;
  await tx(async (client) => {
    await client.query('INSERT INTO rate_counters (api_key_id, window_start_ms, tokens) VALUES ($1, $2, 1) ON CONFLICT (api_key_id, window_start_ms) DO UPDATE SET tokens = rate_counters.tokens + 1', [apiKeyId, windowStart]);
  });
  return true;
}

export async function seedDefaultKey(): Promise<string> {
  const key = crypto.randomBytes(32).toString('hex');
  await query('INSERT INTO api_keys (key, owner) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', [key, 'default']);
  return key;
}

export async function authenticate(req: any): Promise<ApiKey> {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new Error('Missing or invalid API key');
  }
  const key = auth.slice(7);
  const apiKey = await getApiKey(key);
  if (!apiKey) {
    throw new Error('Invalid API key');
  }
  const allowed = await checkRateLimit(apiKey.id, apiKey.rate_limit_per_min);
  if (!allowed) {
    throw new Error('Rate limit exceeded');
  }
  return apiKey;
}