import { describe, it, expect } from 'vitest';
import { createServer } from '../src/server.js';

describe('Health Check', () => {
  it('should return healthy status', async () => {
    const app = await createServer();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('healthy');
    expect(body.database).toBe('up');
  });
});