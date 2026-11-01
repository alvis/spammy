import { describe, it } from 'vitest';

describe('createShowStore', () => {
  it.todo('should persist a created show as <dataDir>/shows/<id>/show.json');
  it.todo('should return null when reading an unknown show');
  it.todo('should list shows newest first');
  it.todo('should write shows atomically via temp file and rename');
  it.todo('should reject show files that fail ShowSchema');
});
