/**
 * The arithmetic of a ruler: which tick a reading sits on, which reading a
 * tick means, and how many decimals the reading keeps.
 *
 * Pure, because both the native strip and the web strip snap and format the
 * same way, and a reading that differed by platform would be an answer that
 * differed by platform.
 */
export type UiIrRulerRange = {
  min: number;
  max: number;
  step: number;
  fractionDigits?: number;
};

export function uiIrRulerStepCount(range: UiIrRulerRange): number {
  return Math.max(0, Math.round((range.max - range.min) / range.step));
}

/** Decimals the step needs: 1 for 0.5, 2 for 0.25, 0 for whole steps. */
export function uiIrRulerFractionDigits(range: UiIrRulerRange): number {
  if (range.fractionDigits !== undefined) return range.fractionDigits;
  const text = String(range.step);
  const exponent = /e-(\d+)$/i.exec(text);
  if (exponent) return Math.min(3, Number(exponent[1]));
  const dot = text.indexOf(".");
  return dot < 0 ? 0 : Math.min(3, text.length - dot - 1);
}

/**
 * The tick a stored reading sits on. A reading nobody wrote yet, or one that
 * does not parse, sits on the first tick — the ruler always shows something.
 */
export function uiIrRulerIndexOf(
  range: UiIrRulerRange,
  value: string | number | null | undefined,
): number {
  const count = uiIrRulerStepCount(range);
  const parsed = typeof value === "number" ? value : Number(value);
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(parsed)
  ) {
    return 0;
  }
  const index = Math.round((parsed - range.min) / range.step);
  return Math.min(count, Math.max(0, index));
}

/** The reading at a tick, as the decimal string the state stores. */
export function uiIrRulerValueAt(range: UiIrRulerRange, index: number): string {
  const count = uiIrRulerStepCount(range);
  const clamped = Math.min(count, Math.max(0, Math.round(index)));
  const value = Math.min(range.max, range.min + clamped * range.step);
  return value.toFixed(uiIrRulerFractionDigits(range));
}

/** The tick under the indicator for a scroll offset. */
export function uiIrRulerIndexAtOffset(input: {
  offset: number;
  itemWidth: number;
  count: number;
}): number {
  if (input.itemWidth <= 0) return 0;
  return Math.min(
    input.count,
    Math.max(0, Math.round(input.offset / input.itemWidth)),
  );
}
