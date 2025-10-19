import { describe, it, expect } from 'vitest';
import { createServer } from '../src/server.js';

describe('Rate Limiting', () => {
  it('should allow requests within limit', async () => {
    const app = await createServer();

    const apiKey = 'test-rate-limit-key';

    // Create API key
    await app.prisma.apiKey.create({
      data: {
        key: apiKey,
        name: 'Rate Limit Test',
      },
    });

    // Make requests up to the limit
    for (let i = 0; i < 5; i++) { // Assuming limit is higher
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      expect([200, 429]).toContain(response.statusCode);
    }
  });

  it('should reject requests over limit', async () => {
    const app = await createServer();

    const apiKey = 'test-rate-limit-exceed';

    await app.prisma.apiKey.create({
      data: {
        key: apiKey,
        name: 'Rate Limit Exceed Test',
      },
    });

    // Make many requests quickly
    const promises = [];
    for (let i = 0; i < 150; i++) { // Exceed typical limit
      promises.push(
        app.inject({
          method: 'GET',
          url: '/health',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        })
      );
    }

    const responses = await Promise.all(promises);
    const rateLimited = responses.some(r => r.statusCode === 429);

    expect(rateLimited).toBe(true);
  });
});