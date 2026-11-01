import { Runner } from '@openai/agents';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import { suggestAwards } from '@spammy/agents';
import { registerAwardRoutes } from './awards';

import type { AppContext } from '../app';
import type { Award, Show } from '@spammy/domain';

vi.mock('@spammy/agents', () => ({
  suggestAwards: vi.fn(async () => [{ id: 'a', decision: 'sealed', winnerId: 'alice' }]),
}));

const awardShow: Show = {
  id: 'show',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  stage: 'analyzed',
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
    participants: [],
    messages: [],
  },
  cast: [],
  groupPhotoAssetId: null,
  awards: [],
};

describe('awards route', () => {
  it('should persist the private winner while returning a sealed response', async () => {
    const show = awardShow;
    const bytes = new TextEncoder().encode(
      JSON.stringify({
        analysis: { stats: [], moments: [], highlights: [], sourceChat: show.chat },
        signature: JSON.stringify({ chat: show.chat, cast: show.cast, range: show.settings.range }),
      }),
    );
    const writeShow = vi.fn();
    const context: AppContext = {
      store: {
        readShow: vi.fn(async () => show),
        readAsset: vi.fn(async () => bytes),
        writeShow,
        createShow: vi.fn(),
        listShows: vi.fn(),
        writeAsset: vi.fn(),
      },
      awardRunner: new Runner({ tracingDisabled: true }),
    };
    const app = new Hono();
    registerAwardRoutes(app, context);
    const response = await app.request('/api/shows/show/awards', { method: 'POST' });
    expect(await response.json()).toMatchObject({ awards: [{ winnerId: null }] });
    expect(writeShow).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'awards-ready',
        awards: [expect.objectContaining({ winnerId: 'alice' })],
      }),
    );
  });
});

describe('award completion races', () => {
  it.each(['settings', 'retry', 'photo'] as const)(
    'should protect current state after %s changes during awards',
    async (change) => {
      let current = structuredClone(awardShow);
      let start!: () => void;
      const started = new Promise<void>((resolve) => {
        start = resolve;
      });
      let finish!: (value: Award[]) => void;
      const deferred = new Promise<Award[]>((resolve) => {
        finish = resolve;
      });
      const award: Award = {
        id: 'new-award',
        title: 'New award',
        showName: 'Show',
        howJudged: 'Votes',
        nominees: [],
        decision: 'sealed',
        winnerId: null,
        receipts: [],
      };
      vi.mocked(suggestAwards).mockImplementationOnce(async () => {
        start();
        return deferred;
      });
      const writeShow = vi.fn(async (show: Show) => {
        current = show;
      });
      const bytes = new TextEncoder().encode(
        JSON.stringify({
          analysis: { stats: [], moments: [], highlights: [], sourceChat: awardShow.chat },
          signature: JSON.stringify({
            chat: awardShow.chat,
            cast: awardShow.cast,
            range: awardShow.settings.range,
          }),
        }),
      );
      const context: AppContext = {
        store: {
          readShow: vi.fn(async () => current),
          writeShow,
          writeAsset: vi.fn(),
          createShow: vi.fn(),
          listShows: vi.fn(),
          readAsset: vi.fn(async () => bytes),
        },
        awardRunner: new Runner({ tracingDisabled: true }),
      };
      const app = new Hono();
      registerAwardRoutes(app, context);
      const oldRequest = app.request('/api/shows/show/awards', { method: 'POST' });
      await started;
      if (change === 'settings')
        current = { ...current, settings: { ...current.settings, roastLevel: 'savage' } };
      if (change === 'photo') current = { ...current, groupPhotoAssetId: 'new-photo' };
      if (change === 'retry') {
        vi.mocked(suggestAwards).mockResolvedValueOnce([award]);
        expect((await app.request('/api/shows/show/awards', { method: 'POST' })).status).toBe(200);
      }
      const before = structuredClone(current);
      finish([]);
      const response = await oldRequest;
      expect(response.status).toBe(change === 'photo' ? 200 : 409);
      if (change === 'photo') expect(current.groupPhotoAssetId).toBe('new-photo');
      else expect(current).toEqual(before);
      expect(writeShow).toHaveBeenCalledTimes(change === 'settings' ? 0 : 1);
    },
  );
});
