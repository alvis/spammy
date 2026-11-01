import { describe, expect, it } from 'vitest';

import { createShowStore } from '@spammy/store';

import { createApp } from './app';

const app = createApp({ store: createShowStore({ dataDir: '/tmp/spammy-test' }) });

describe('fn:createApp', () => {
  it('should report health', async () => {
    const response = await app.request('/api/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('should map NotImplementedError to 501 with the feature name', async () => {
    const response = await app.request('/api/shows/show-1/analysis', { method: 'POST' });

    expect(response.status).toBe(501);
    expect(await response.json()).toEqual({
      error: 'not_implemented',
      feature: 'server.analyzeChat',
    });
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

it('should update settings and awards while keeping sealed choices private', async () => {
  const store = createShowStore({ dataDir: `/tmp/spammy-settings-${crypto.randomUUID()}` });
  const show = await store.createShow({});
  const award = {
    id: 'award-1',
    title: 'Best Timing in the Entire Group',
    showName: 'The Spammys',
    howJudged: 'Message timing',
    decision: 'sealed' as const,
    winnerId: 'person-1',
    nominees: [
      {
        participantId: 'person-1',
        stat: 'Always early',
        quote: 'Hello',
        receiptMessageId: 'message-1',
      },
    ],
    receipts: [
      {
        messageId: 'message-1',
        authorId: 'person-1',
        quote: 'Hello',
        sentAt: '2026-01-01T10:00:00',
      },
    ],
  };
  await store.writeShow({
    ...show,
    cast: [
      {
        id: 'cast-1',
        participantId: 'person-1',
        displayName: 'Alex',
        photoAssetId: null,
        face: null,
      },
    ],
    chat: {
      format: 'android-txt',
      dateOrder: 'day-first',
      groupName: 'Group',
      participants: [{ id: 'person-1', displayName: 'Alex', messageCount: 1 }],
      messages: [
        {
          id: 'message-1',
          sentAt: '2026-01-01T10:00:00',
          authorId: 'person-1',
          text: 'Hello',
          kind: 'text',
        },
      ],
    },
    awards: [award],
  });
  const app = createApp({ store });

  const settings = await app.request(`/api/shows/${show.id}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ look: 'blacktie' }),
  });
  const awards = await app.request(`/api/shows/${show.id}/awards`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ awards: [{ ...award, winnerId: null }] }),
  });
  const saved = await store.readShow(show.id);

  expect(settings.status).toBe(200);
  expect(await awards.json()).toEqual(
    expect.objectContaining({
      awards: [expect.objectContaining({ winnerId: null })],
      settings: expect.objectContaining({ look: 'blacktie' }),
    }),
  );
  expect(saved?.awards[0]?.winnerId).toBe('person-1');
  // Existing ceremonies remain editable without rewriting their old titles.
  expect(awards.status).toBe(200);
  for (const id of [award.id, 'new-award']) {
    const rejected = await app.request(`/api/shows/${show.id}/awards`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ awards: [{ ...award, id, title: 'One two three four five' }] }),
    });
    expect(rejected.status).toBe(400);
    expect(await rejected.json()).toMatchObject({ error: 'invalid_award_title' });
    expect((await store.readShow(show.id))?.awards).toEqual(saved?.awards);
  }
  const renamed = await app.request(`/api/shows/${show.id}/awards`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ awards: [{ ...award, title: 'Always Right On Time' }] }),
  });
  expect(renamed.status).toBe(200);
  expect((await store.readShow(show.id))?.awards[0]?.title).toBe('Always Right On Time');
});

it('should reject cross-site requests and non-loopback hostnames', async () => {
  const hostileOrigin = await app.request('/api/shows', {
    method: 'POST',
    headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' },
    body: '{}',
  });
  const hostileHost = await app.request('http://untrusted.example/api/health');

  expect([hostileOrigin.status, hostileHost.status]).toEqual([403, 403]);
});
