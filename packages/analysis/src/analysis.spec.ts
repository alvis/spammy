import { describe, it } from 'vitest';

describe('pseudonymizeChat', () => {
  it.todo('should replace every participant name and @-mention with a stable alias');
  it.todo('should return an alias map that restores the original names');
});

describe('analyzeChat', () => {
  it.todo('should compute per-participant stats only within the selected range');
  it.todo('should request highlights from OPENAI_MODELS.bulkRead with the pseudonymized chat');
});

describe('estimateTokens', () => {
  it.todo('should scale with the number of messages in range');
});
