import { describe, expect, it } from 'vitest';
import { nomineeCameraTime } from './nominee-camera-time';
import { nomineeChoreography } from './stage-choreography';

const nominees = [
  { name: 'Alex River', stat: 'Nine early replies' },
  { name: 'Jamie', stat: 'Ten voice notes' },
  { name: 'Sam', stat: 'Seven memes' },
];
const words =
  'The nominees are… Alex River. Nine early replies. Jamie. Ten voice notes. Sam. Seven memes. Alex said this quote.'
    .split(' ')
    .map((word, index) => ({ word, start: index, end: index + 0.8 }));

describe('fn:nomineeCameraTime', () => {
  it('should keep each camera focus on the spoken nominee beyond the silent nine-second schedule', () => {
    for (const [elapsedSeconds, focus] of [
      [4, 0],
      [10, 1],
      [13, 2],
      [16, -1],
    ] as const) {
      const timeSeconds = nomineeCameraTime(elapsedSeconds, nominees, words);
      expect(nomineeChoreography(timeSeconds).focus).toBe(focus);
    }
    expect(nomineeCameraTime(3, nominees, words)).toBe(1);
    expect(nomineeCameraTime(8, nominees, words)).toBeCloseTo(3.4);
    expect(nomineeCameraTime(12, nominees, words)).toBeCloseTo(5.8);
    expect(nomineeCameraTime(30, nominees, words)).toBeCloseTo(9.3);
  });

  it('should use the silent clock when alignment is missing, mismatched or incomplete', () => {
    expect(nomineeCameraTime(4, nominees, [])).toBe(4);
    expect(nomineeCameraTime(4, nominees, words.slice(0, 7))).toBe(4);
    expect(nomineeCameraTime(4, [{ name: 'Someone else', stat: 'Nine replies' }], words)).toBe(4);
  });

  it('should execute independently when embedded in the renderer', () => {
    const embedded = new Function(`return (${nomineeCameraTime.toString()})`)();
    expect(embedded(10, nominees, words)).toBe(nomineeCameraTime(10, nominees, words));
  });
});
