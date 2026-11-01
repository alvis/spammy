/** maps aligned nominee introductions to the shared camera clock; self-contained for export */
export function nomineeCameraTime(
  elapsedSeconds: number,
  nominees: { name: string; stat: string }[],
  words: { word: string; start: number; end: number }[],
): number {
  const tokens = (text: string): string[] =>
    text
      .toLowerCase()
      .split(/\s+/u)
      .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
      .filter(Boolean);
  if (nominees.length === 0 || nominees.length > 3 || words.length === 0) return elapsedSeconds;
  const aligned = words.flatMap((word) => {
    const parts = tokens(word.word);
    return parts.map((text, index) => ({
      text,
      start: word.start + ((word.end - word.start) * index) / parts.length,
      end: word.start + ((word.end - word.start) * (index + 1)) / parts.length,
    }));
  });
  let cursor = 0;
  const consume = (text: string): { start: number; end: number } | null => {
    const expected = tokens(text);
    const first = aligned[cursor];
    if (!expected.length || !first) return null;
    let endSeconds = first.start;
    for (const token of expected) {
      const word = aligned[cursor++];
      if (
        !word ||
        word.text !== token ||
        !Number.isFinite(word.start) ||
        !Number.isFinite(word.end) ||
        word.start < endSeconds ||
        word.end < word.start
      )
        return null;
      endSeconds = word.end;
    }
    return { start: first.start, end: endSeconds };
  };
  if (!consume('The nominees are')) return elapsedSeconds;
  const cues: { start: number; end: number }[] = [];
  for (const nominee of nominees) {
    const cue = consume(`${nominee.name} ${nominee.stat}`);
    if (!cue || cue.end <= cue.start || cue.start < (cues.at(-1)?.end ?? 0)) return elapsedSeconds;
    cues.push(cue);
  }
  const first = cues[0]!;
  const last = cues[cues.length - 1]!;
  if (elapsedSeconds < first.start)
    return first.start > 0 ? Math.max(0, elapsedSeconds) / first.start : 0;
  if (elapsedSeconds >= last.end) return 8.2 + Math.min(elapsedSeconds - last.end, 1.1);
  const index = cues.findIndex(
    (cue, position) =>
      elapsedSeconds >= cue.start && elapsedSeconds < (cues[position + 1]?.start ?? cue.end),
  );
  if (index < 0) return elapsedSeconds;
  const cue = cues[index]!;
  const endSeconds = cues[index + 1]?.start ?? cue.end;
  return 1 + index * 2.4 + ((elapsedSeconds - cue.start) / (endSeconds - cue.start)) * 2.4;
}
