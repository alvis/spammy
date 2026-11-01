import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parseExport } from './whatsapp';

describe('fn:parseExport', () => {
  it('should parse the synthetic Android conversation including continuations and system events', () => {
    const bytes = readFileSync(new URL('../../../fixtures/android-sample.txt', import.meta.url));

    const chat = parseExport({ fileName: 'android-sample.txt', bytes });

    expect(chat).toMatchObject({
      format: 'android-txt',
      dateOrder: 'day-first',
      groupName: 'Brunch Club 🥞',
    });
    expect(
      chat.participants.map(({ displayName, messageCount }) => ({ displayName, messageCount })),
    ).toEqual([
      { displayName: 'Priya Shah', messageCount: 4 },
      { displayName: 'Tom Okafor', messageCount: 7 },
      { displayName: 'Mei Lin', messageCount: 6 },
      { displayName: 'Jonas Berg', messageCount: 7 },
    ]);
    expect(
      chat.messages.find((message) => message.text.startsWith('I have a theory'))?.text,
    ).toContain('\nthere are three reasons\n1. altitude');
    expect(chat.messages.filter(({ kind }) => kind === 'system')).toHaveLength(5);
    expect(chat.messages.filter(({ kind }) => kind === 'deleted')).toHaveLength(1);
    expect(chat.messages.filter(({ kind }) => kind === 'media-omitted')).toHaveLength(2);
  });
  // TODO(draft): finalize edge-case coverage after direction approval
  it.todo('should parse fixtures/iphone-sample.txt into participants and messages');
  it.todo('should unzip an iPhone .zip export and parse the _chat.txt inside');
  it.todo('should fold multi-line messages into one message');
  it.todo('should mark <Media omitted> and deleted messages by kind');
  it.todo('should report ambiguous date order when every day is <= 12');
  it.todo('should honor an explicit dateOrder override');
});

describe('fn:detectFormat', () => {
  it.todo('should detect android-txt, iphone-txt and iphone-zip');
});
