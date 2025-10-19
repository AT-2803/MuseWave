import { describe, it, expect } from 'vitest';
import { createServer } from '../src/server.js';

describe('Generation Pipeline E2E', () => {
  it('should generate music successfully', async () => {
    const app = await createServer();

    // Create API key first (mock)
    const apiKey = 'test-key-123';

    // Mock API key in database
    await app.prisma.apiKey.create({
      data: {
        key: apiKey,
        name: 'Test Key',
      },
    });

    // Generate request
    const response = await app.inject({
      method: 'POST',
      url: '/generate',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'Create a happy electronic track',
        duration: 30,
        includeVideo: false,
      }),
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('jobId');
    expect(typeof body.jobId).toBe('string');

    // Check job status
    const jobResponse = await app.inject({
      method: 'GET',
      url: `/jobs/${body.jobId}`,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    expect(jobResponse.statusCode).toBe(200);
    const jobBody = JSON.parse(jobResponse.body);
    expect(jobBody.id).toBe(body.jobId);
    expect(jobBody.status).toBe('pending');
  });
});