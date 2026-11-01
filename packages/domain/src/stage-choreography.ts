/** scene-relative nominee camera and card presentation */
export interface NomineeChoreography {
  focus: number;
  camera: string;
  titleOpacity: number;
  cards: { opacity: number; quoteOpacity: number; entrance: number }[];
}

/** computes prototype camera cuts without wall-clock transitions; self-contained for export */
export function nomineeChoreography(elapsedSeconds: number, count = 3): NomineeChoreography {
  const timeSeconds = Math.max(0, elapsedSeconds);
  if (count <= 0)
    return { focus: -1, camera: 'scale(1.0000) translateX(0.0000%)', titleOpacity: 1, cards: [] };
  const focus =
    timeSeconds >= 1 && timeSeconds < 8.2
      ? Math.min(count - 1, Math.floor((timeSeconds - 1) / 2.4))
      : -1;
  const cutSeconds = timeSeconds < 1 ? 0 : timeSeconds >= 8.2 ? 8.2 : 1 + focus * 2.4;
  const previous = timeSeconds >= 8.2 ? Math.min(count - 1, 2) : focus - 1;
  const progress = Math.min(Math.max((timeSeconds - cutSeconds) / 1.1, 0), 1);
  const ease = progress * progress * (3 - 2 * progress);
  const fromScale = previous < 0 ? 1 : 1.3;
  const toScale = focus < 0 ? 1 : 1.3;
  const fromX = previous < 0 ? 0 : ((count - 1) / 2 - previous) * (103.2 / count);
  const toX = focus < 0 ? 0 : ((count - 1) / 2 - focus) * (103.2 / count);
  const fade = Math.min(Math.max((timeSeconds - cutSeconds) / 0.5, 0), 1);
  return {
    focus,
    camera: `scale(${(fromScale + (toScale - fromScale) * ease).toFixed(4)}) translateX(${(fromX + (toX - fromX) * ease).toFixed(4)}%)`,
    titleOpacity: timeSeconds < 1 ? 1 : focus < 0 ? fade : 1 - Math.min((timeSeconds - 1) / 0.5, 1),
    cards: Array.from({ length: count }, (_, index) => ({
      opacity: focus < 0 || focus === index ? 1 : 0.3,
      quoteOpacity: focus === index ? fade : 0,
      entrance: Math.min(Math.max((timeSeconds - 0.2 - index * 0.2) / 0.5, 0), 1),
    })),
  };
}

/** deterministic two-row crowd bob or cheer, safe to embed in the export runtime */
export function audienceMotion(elapsedSeconds: number, cheering: boolean, index: number): string {
  const phase = index * 0.37;
  const periodSeconds = cheering ? 0.64 + (index % 5) * 0.08 : 3;
  const lift =
    (1 - Math.cos((Math.max(0, elapsedSeconds) / periodSeconds + phase) * Math.PI * 2)) / 2;
  return `translateY(${(-lift * (cheering ? 38 : 5)).toFixed(4)}%)`;
}
