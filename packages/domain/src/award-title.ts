/** maximum whitespace-separated words in newly written award titles */
export const MAX_AWARD_TITLE_WORDS = 4;

/** returns an actionable error without changing host input */
export function awardTitleError(title: string): string | null {
  const words = title.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return 'Enter an award name.';
  return words.length > MAX_AWARD_TITLE_WORDS
    ? 'Use four words or fewer for the award name.'
    : null;
}

/** condenses model titles only, retaining a theme when verbose output needs a fallback */
export function normalizeGeneratedAwardTitle(title: string): string {
  const clean = title.trim().replace(/\s+/gu, ' ');
  if (!awardTitleError(clean)) return clean;
  const concise = clean
    .split(' ')
    .filter(
      (word) => !/^(the|a|an|in|of|for|to|by|on|at|and|with|every|most|best|award)$/iu.test(word),
    )
    .join(' ');
  if (!awardTitleError(concise)) return concise;
  const themes: [RegExp, string][] = [
    [/voice|monologue/iu, 'Voice Note Virtuoso'],
    [/laugh|lol/iu, 'Laughter Legend'],
    [/late|lateness/iu, 'Fashionably Late'],
    [/read|reply|replies|ghost/iu, 'Reply Houdini'],
    [/plan|organiz/iu, 'Master Planner'],
    [/main character/iu, 'Main Character'],
    [/meme/iu, 'Meme Royalty'],
  ];
  return themes.find(([pattern]) => pattern.test(clean))?.[1] ?? 'Group Chat Legend';
}
