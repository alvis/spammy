import { describe, it } from 'vitest';

describe('suggestAwards', () => {
  it.todo('should return awards that validate against AwardSchema');
  it.todo('should only nominate cast members');
  it.todo('should attach receipts that reference real message ids');
});

describe('judgeSealedAwards', () => {
  it.todo('should set a winner from the nominees for every sealed award');
  it.todo('should leave host-picked awards unchanged');
});

describe('writeStoryboard', () => {
  it.todo('should produce one signature segment per award');
});

describe('locateFaces', () => {
  it.todo('should return normalized face boxes from OPENAI_MODELS.faceLocation');
});
