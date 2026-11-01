import { describe, expect, it } from 'vitest';

import { createShowStore } from '@wrapa/store';

import { createApp } from './app';

const app = createApp({ store: createShowStore({ dataDir: '/tmp/wrapa-test' }) });

describe('createApp', () => {
  it('should report health', async () => {
    const response = await app.request('/api/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('should map NotImplementedError to 501 with the feature name', async () => {
    const response = await app.request('/api/shows/show-1/analysis', { method: 'POST' });

    expect(response.status).toBe(501);
    expect(await response.json()).toEqual({ error: 'not_implemented', feature: 'server.analyzeChat' });
  });

  it('should reject an invalid create-show request', async () => {
    const response = await app.request('/api/shows', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ persona: 'elvis' }),
    });

    expect(response.status).toBe(400);
  });
});
