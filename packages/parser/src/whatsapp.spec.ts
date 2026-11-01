import { describe, it } from 'vitest';

describe('parseExport', () => {
  it.todo('should parse fixtures/android-sample.txt into participants and messages');
  it.todo('should parse fixtures/iphone-sample.txt into participants and messages');
  it.todo('should unzip an iPhone .zip export and parse the _chat.txt inside');
  it.todo('should fold multi-line messages into one message');
  it.todo('should mark <Media omitted> and deleted messages by kind');
  it.todo('should report ambiguous date order when every day is <= 12');
  it.todo('should honor an explicit dateOrder override');
});

describe('detectFormat', () => {
  it.todo('should detect android-txt, iphone-txt and iphone-zip');
});
