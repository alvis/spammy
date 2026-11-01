/** character performance on the ceremony clock */
export type CharacterMotionRole = 'nominee' | 'winner' | 'finale';

/**
 * returns a deterministic whole-avatar pose from scene-relative seconds
 * keep this function self-contained: the exporter embeds it in its seekable runtime
 */
export function characterMotion(
  elapsedSeconds: number,
  role: CharacterMotionRole,
  index = 0,
): string {
  const timeSeconds = Math.max(0, Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0);
  const delaySeconds = role === 'winner' ? 0.4 : 0.2 + index * 0.2;
  const localSeconds = Math.max(0, timeSeconds - delaySeconds);
  const entrance = Math.min(localSeconds / 0.6, 1);
  const settle = (1 - entrance) ** 3;
  const phase = localSeconds * Math.PI * 1.2;
  const celebration = role === 'winner' ? Math.exp(-localSeconds / 2.8) : 0;
  const lift = -Math.abs(Math.sin(localSeconds * Math.PI * 2.2)) * 8 * celebration;
  const sway = Math.sin(phase) * (role === 'finale' ? 0.8 : 1.5);
  const rotation = sway + Math.sin(localSeconds * Math.PI * 3) * 3 * celebration;
  const y = settle * 7 + lift;
  const scale = 1 - settle * 0.07;
  return `translateY(${y.toFixed(4)}%) rotate(${rotation.toFixed(4)}deg) scale(${scale.toFixed(4)})`;
}
