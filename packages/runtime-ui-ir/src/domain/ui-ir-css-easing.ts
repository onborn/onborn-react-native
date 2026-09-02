/**
 * Timing functions in the dialect are CSS strings — "ease-out",
 * "cubic-bezier(0.23, 1, 0.32, 1)" — because that is what a theme token and
 * a style literal can hold, and what the web preview hands to the browser
 * untouched. Reanimated's CSS engine reads the named curves as strings but
 * refuses a cubic-bezier string outright: it wants its own `cubicBezier(x1,
 * y1, x2, y2)` easing object. The screen with the theme's easing rendered
 * fine in the builder and threw on the phone.
 *
 * This is the bridge: the four numbers parsed out of the string, and a style
 * copy where every timing key carries whatever the caller builds from them.
 */

const CUBIC_BEZIER =
  /^cubic-bezier\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/;

const TIMING_KEYS = [
  "animationTimingFunction",
  "transitionTimingFunction",
] as const;

export type UiIrCubicBezierPoints = readonly [number, number, number, number];

export function parseUiIrCubicBezier(
  value: unknown,
): UiIrCubicBezierPoints | null {
  if (typeof value !== "string") return null;
  const match = CUBIC_BEZIER.exec(value.trim());
  if (!match) return null;
  return [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
  ];
}

/**
 * The same style with cubic-bezier timing strings replaced by what `toEasing`
 * makes of their points. Named curves and everything else pass through; a
 * style with nothing to replace is returned as the very same object, so
 * memoised renders keep their identity.
 */
export function materializeUiIrCssEasing<Style extends object | undefined>(
  style: Style,
  toEasing: (points: UiIrCubicBezierPoints) => unknown,
): Style {
  if (!style) return style;
  let copy: Record<string, unknown> | undefined;
  for (const key of TIMING_KEYS) {
    const points = parseUiIrCubicBezier((style as Record<string, unknown>)[key]);
    if (!points) continue;
    copy ??= { ...(style as Record<string, unknown>) };
    copy[key] = toEasing(points);
  }
  return (copy ?? style) as Style;
}
