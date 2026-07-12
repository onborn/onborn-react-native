import { LAYOUT_BG_GRADIENT_PRESETS, type LayoutBgGradientPreset } from "./types";

/**
 * Default gradient angle (degrees, CSS convention: 0 = to top, 90 = to right,
 * 135 = to bottom-right). Preset gradients historically rendered as a 135°
 * top-left → bottom-right diagonal, so that stays the default when no explicit
 * angle is provided — existing flows keep their exact look.
 */
export const DEFAULT_GRADIENT_ANGLE = 135;

/** A single color stop. `position` is 0..1 along the gradient line. */
export type GradientStop = {
  color: string;
  position?: number;
};

/** Loose shape shared by layout `bg` and component `bg` gradient objects. */
export type GradientBgLike = {
  preset?: string;
  angle?: number;
  stops?: ReadonlyArray<GradientStop>;
};

export type ResolvedGradient = {
  /** Angle in degrees, CSS convention (0 = to top, clockwise). */
  angle: number;
  /** At least two colors, in order. */
  colors: string[];
  /**
   * 0..1 stop positions aligned to `colors`, or `undefined` to let the renderer
   * distribute stops evenly. Only set when every custom stop provided one.
   */
  locations: number[] | undefined;
};

const DEFAULT_FALLBACK_COLORS: readonly [string, string] = ["#0E1116", "#000000"];

function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function normalizeAngle(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_GRADIENT_ANGLE;
  }
  return ((value % 360) + 360) % 360;
}

export function isLayoutGradientPreset(
  value: string | undefined,
): value is LayoutBgGradientPreset {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(LAYOUT_BG_GRADIENT_PRESETS, value)
  );
}

/**
 * Resolve any layout/component gradient bg into concrete render inputs.
 * Custom `stops` (2–4) win when present and valid; otherwise a named `preset`
 * is used; otherwise `fallbackColors`. Renderer-agnostic: RN maps `angle` to
 * start/end vectors via `gradientAngleToStartEnd`, web uses `${angle}deg`.
 */
export function resolveGradient(
  bg: GradientBgLike | null | undefined,
  fallbackColors: readonly [string, string] = DEFAULT_FALLBACK_COLORS,
): ResolvedGradient {
  const angle = normalizeAngle(bg?.angle);

  const stops = bg?.stops;
  if (Array.isArray(stops) && stops.length >= 2) {
    const colors = stops.map((stop) => stop.color);
    const everyStopHasPosition = stops.every(
      (stop) => typeof stop.position === "number",
    );
    const locations = everyStopHasPosition
      ? stops.map((stop) => clamp01(stop.position as number))
      : undefined;
    return { angle, colors, locations };
  }

  if (isLayoutGradientPreset(bg?.preset)) {
    return {
      angle,
      colors: [...LAYOUT_BG_GRADIENT_PRESETS[bg.preset].colors],
      locations: undefined,
    };
  }

  return { angle, colors: [...fallbackColors], locations: undefined };
}

/**
 * Convert a CSS-convention gradient angle into `expo-linear-gradient`
 * start/end points (unit square, 0,0 = top-left). The line is extended to the
 * box edges so a 135° angle maps exactly to (0,0)→(1,1), preserving the look of
 * the historical preset diagonal.
 */
export function gradientAngleToStartEnd(angleDeg: number): {
  start: { x: number; y: number };
  end: { x: number; y: number };
} {
  const rad = (normalizeAngle(angleDeg) * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const scale = 0.5 / Math.max(Math.abs(dx), Math.abs(dy), 1e-6);
  return {
    start: { x: clamp01(0.5 - dx * scale), y: clamp01(0.5 - dy * scale) },
    end: { x: clamp01(0.5 + dx * scale), y: clamp01(0.5 + dy * scale) },
  };
}

/**
 * Resolve the single solid color that best represents a gradient (used for
 * status-bar / safe-area tint fallbacks). Returns the last stop/color.
 */
export function resolveGradientSolidColor(
  bg: GradientBgLike | null | undefined,
  fallback = "#000000",
): string {
  const resolved = resolveGradient(bg, [fallback, fallback]);
  return resolved.colors[resolved.colors.length - 1] ?? fallback;
}
