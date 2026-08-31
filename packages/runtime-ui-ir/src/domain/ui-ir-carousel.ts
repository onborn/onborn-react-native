/**
 * Which page a horizontal offset is showing.
 *
 * Kept out of the component so the arithmetic is testable without a device:
 * an off-by-one here lights the wrong dot, and a page width of zero — the
 * first frame, before the strip has been measured — must not produce NaN.
 */
export function uiIrCarouselPageAt(input: {
  offset: number;
  pageWidth: number;
  pageCount: number;
}): number {
  if (input.pageWidth <= 0 || input.pageCount <= 0) return 0;
  const page = Math.round(input.offset / input.pageWidth);
  return Math.min(Math.max(page, 0), input.pageCount - 1);
}

/**
 * The page an auto-advance moves to, wrapping at the end.
 *
 * Wrapping rather than stopping: a welcome carousel that halts on its last
 * slide looks broken to someone who glanced away, and there is no "finished"
 * state for it to mean.
 */
export function uiIrCarouselNextPage(
  current: number,
  pageCount: number,
): number {
  if (pageCount <= 0) return 0;
  return (Math.max(0, current) + 1) % pageCount;
}
