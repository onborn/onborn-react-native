/**
 * How full the journey's bar is on a screen, 0..1.
 *
 * `from` is where the bar stands on the first screen — products open their
 * bar a fifth full so the first step already reads as progress — and the
 * last screen fills it. A journey of one screen is complete on arrival.
 */
export function uiIrJourneyProgress(input: {
  position: number;
  total: number;
  from?: number;
}): number {
  const from = clamp(input.from ?? 0);
  if (input.total <= 1) return 1;
  const walked = clamp(input.position / (input.total - 1));
  return from + walked * (1 - from);
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
