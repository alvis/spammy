import { describe, expect, it } from 'vitest';

import { audienceMotion, nomineeChoreography } from './stage-choreography';

describe('fn:nomineeChoreography', () => {
  it('should focus each nominee on the prototype schedule and return to the wide shot', () => {
    expect([0, 1, 3.4, 5.8, 8.2, 9].map((time) => nomineeChoreography(time).focus)).toEqual([
      -1, 0, 1, 2, -1, -1,
    ]);
    const focused = nomineeChoreography(2.2);
    expect(focused.camera).toBe('scale(1.3000) translateX(34.4000%)');
    expect(focused.titleOpacity).toBe(0);
    expect(focused.cards.map((card) => card.quoteOpacity)).toEqual([1, 0, 0]);
    expect(focused.cards.map((card) => card.opacity)).toEqual([1, 0.3, 0.3]);
    expect(nomineeChoreography(0.4).cards.map((card) => card.entrance)).toEqual([0.4, 0, 0]);
    expect(nomineeChoreography(3.4, 1).camera).toBe(nomineeChoreography(2.2, 1).camera);
    expect(nomineeChoreography(5.8, 2).camera).toBe(nomineeChoreography(4.6, 2).camera);
    expect(nomineeChoreography(5.8, 0)).toEqual({
      focus: -1,
      camera: 'scale(1.0000) translateX(0.0000%)',
      titleOpacity: 1,
      cards: [],
    });
    nomineeChoreography(9);
    expect(nomineeChoreography(2.2)).toEqual(focused);
  });
});

describe('fn:audienceMotion', () => {
  it('should cheer more vigorously while preserving deterministic pause and seek poses', () => {
    const bob = audienceMotion(0.2, false, 0);
    const cheer = audienceMotion(0.2, true, 0);
    expect(bob).not.toBe(cheer);
    audienceMotion(8, true, 0);
    expect(audienceMotion(0.2, true, 0)).toBe(cheer);
    expect(audienceMotion(0, false, 0)).toBe('translateY(0.0000%)');
  });
});
