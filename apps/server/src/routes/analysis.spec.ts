import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import { analyzeChat } from '@spammy/analysis';
import { registerAnalysisRoutes } from './analysis';

import { OpenAI } from 'openai';
import type { AppContext } from '../app';
import type { ChatAnalysis, Show } from '@spammy/domain';

vi.mock('@spammy/analysis', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@spammy/analysis')>();
  return { ...actual, analyzeChat: vi.fn(actual.analyzeChat) };
});

const analysisShow: Show = {
  id: 'show',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  stage: 'chat-uploaded',
  settings: {
    groupKind: 'friends',
    persona: 'goldie',
    look: 'ivory',
    roastLevel: 'gentle',
    range: null,
  },
  chat: {
    format: 'android-txt',
    dateOrder: 'day-first',
    groupName: null,
    participants: [{ id: 'alice', displayName: 'Alice', messageCount: 1 }],
    messages: [
      {
        id: 'm1',
        authorId: 'alice',
        text: 'Hi Alice',
        sentAt: '2026-01-01T00:00:00',
        kind: 'text',
      },
    ],
  },
  cast: [
    { id: 'cast', participantId: 'alice', displayName: 'Alice', face: null, photoAssetId: null },
  ],
  groupPhotoAssetId: null,
  awards: [],
};

describe('analysis route', () => {
  it('should persist private evidence and advances the show after a safe request', async () => {
    const writeShow = vi.fn();
    const writeAsset = vi.fn();
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response(
          JSON.stringify({
            id: 'resp_test',
            object: 'response',
            status: 'completed',
            output: [
              {
                type: 'message',
                id: 'msg_test',
                role: 'assistant',
                status: 'completed',
                content: [
                  { type: 'output_text', text: JSON.stringify({ moments: [] }), annotations: [] },
                ],
              },
            ],
          }),
          { headers: { 'content-type': 'application/json' } },
        ),
    );
    const openai = new OpenAI({ apiKey: 'test-only', fetch });
    const context: AppContext = {
      store: {
        readShow: vi.fn(async () => analysisShow),
        writeShow,
        writeAsset,
        createShow: vi.fn(),
        listShows: vi.fn(),
        readAsset: vi.fn(),
      },
      openai,
    };
    const app = new Hono();
    registerAnalysisRoutes(app, context);
    const response = await app.request('/api/shows/show/analysis', { method: 'POST' });
    expect(response.status).toBe(200);
    expect(writeShow).toHaveBeenCalledWith(expect.objectContaining({ stage: 'analyzed' }));
    expect(writeAsset).toHaveBeenCalledOnce();
    expect(JSON.stringify(fetch.mock.calls)).not.toContain('Alice');
  });
});

describe('analysis completion races', () => {
  it.each(['settings', 'retry', 'photo'] as const)(
    'should protect current state after %s changes during analysis',
    async (change) => {
      let current = structuredClone(analysisShow);
      let start!: () => void;
      const started = new Promise<void>((resolve) => {
        start = resolve;
      });
      let finish!: (value: ChatAnalysis) => void;
      const deferred = new Promise<ChatAnalysis>((resolve) => {
        finish = resolve;
      });
      const analysis: ChatAnalysis = {
        stats: [],
        moments: [],
        highlights: [],
        sourceChat: analysisShow.chat!,
      };
      vi.mocked(analyzeChat).mockImplementationOnce(async () => {
        start();
        return deferred;
      });
      const writeShow = vi.fn(async (show: Show) => {
        current = show;
      });
      const writeAsset = vi.fn();
      const context: AppContext = {
        store: {
          readShow: vi.fn(async () => current),
          writeShow,
          writeAsset,
          createShow: vi.fn(),
          listShows: vi.fn(),
          readAsset: vi.fn(),
        },
        openai: new OpenAI({ apiKey: 'test-only' }),
      };
      const app = new Hono();
      registerAnalysisRoutes(app, context);
      const oldRequest = app.request('/api/shows/show/analysis', { method: 'POST' });
      await started;
      if (change === 'settings')
        current = {
          ...current,
          settings: { ...current.settings, range: { from: '2026-01-02', to: '2026-01-03' } },
        };
      if (change === 'photo') current = { ...current, groupPhotoAssetId: 'new-photo' };
      if (change === 'retry') {
        vi.mocked(analyzeChat).mockResolvedValueOnce(analysis);
        expect((await app.request('/api/shows/show/analysis', { method: 'POST' })).status).toBe(
          200,
        );
      }
      const before = structuredClone(current);
      finish(analysis);
      const response = await oldRequest;
      expect(response.status).toBe(change === 'photo' ? 200 : 409);
      if (change === 'photo') expect(current.groupPhotoAssetId).toBe('new-photo');
      else expect(current).toEqual(before);
      expect(writeShow).toHaveBeenCalledTimes(change === 'settings' ? 0 : 1);
      expect(writeAsset).toHaveBeenCalledTimes(change === 'settings' ? 0 : 1);
    },
  );
});
