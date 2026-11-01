import { describe, expect, it } from 'vitest';

import { characterMotion } from './character-motion';

describe('fn:characterMotion', () => {
  it('should enter, sway and celebrate reproducibly when seeking or pausing', () => {
    const start = characterMotion(0, 'nominee');
    expect(start).toBe('translateY(7.0000%) rotate(0.0000deg) scale(0.9300)');
    expect(characterMotion(0.4, 'nominee', 1)).toBe(start);
    const pose = characterMotion(1.25, 'winner');
    characterMotion(8, 'winner');
    expect(characterMotion(1.25, 'winner')).toBe(pose);
    expect(pose).not.toBe(characterMotion(1.25, 'nominee'));
    expect(characterMotion(2, 'nominee')).not.toBe(characterMotion(3, 'nominee'));
    expect(characterMotion(-1, 'nominee')).toBe(start);
    expect(characterMotion(Number.NaN, 'nominee')).toBe(start);
  });
});
