import { describe, expect, it } from 'vitest';

import { awardTitleError, normalizeGeneratedAwardTitle } from './award-title';
import { AwardSchema } from './show';

describe('award title write bounds', () => {
  it('should accepts four words across Unicode whitespace and rejects empty or longer names', () => {
    expect(awardTitleError('  The\tGroup\nChat\u00a0Legend  ')).toBeNull();
    expect(awardTitleError('One two three four five')).toBe(
      'Use four words or fewer for the award name.',
    );
    expect(awardTitleError(' \n ')).toBe('Enter an award name.');
  });

  it('should keeps persisted long titles readable', () => {
    expect(AwardSchema.shape.title.parse('Best Monologue in a Voice Note')).toBe(
      'Best Monologue in a Voice Note',
    );
  });

  it('should condenses generated titles without producing dangling sentence fragments', () => {
    expect(normalizeGeneratedAwardTitle('Best Monologue in a Voice Note')).toBe(
      'Monologue Voice Note',
    );
    expect(
      normalizeGeneratedAwardTitle(
        'The person who always sends incredibly long voice notes every morning',
      ),
    ).toBe('Voice Note Virtuoso');
    expect(normalizeGeneratedAwardTitle('One two three four five six seven')).toBe(
      'Group Chat Legend',
    );
    expect(normalizeGeneratedAwardTitle('Best Plot Twist')).toBe('Best Plot Twist');
  });
});
