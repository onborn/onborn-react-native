import type { BuilderV2UiIrNode, BuilderV2UiIrStyle } from "@onborn/sdk-contracts/builder-v2-ui-ir";

type GradientNode = Extract<BuilderV2UiIrNode, { type: "linear-gradient" }>;

export type UiIrGradientStop = {
  /** 0..1 along the axis. */
  offset: number;
  /** An opaque colour; the alpha travels separately. */
  color: string;
  opacity: number;
};

/**
 * The stops a vector gradient element draws, from what the document says.
 *
 * Alpha is split out of an eight-digit hex into stopOpacity because the SVG
 * renderer reads `#RRGGBBAA` on some platforms and not on others, while
 * every platform reads stopOpacity. Missing locations spread the colours
 * evenly, which is what expo-linear-gradient does with the same input.
 */
export function uiIrGradientStops(
  node: Pick<GradientNode, "colors" | "locations">,
): UiIrGradientStop[] {
  const count = node.colors.length;
  const located =
    node.locations && node.locations.length === count ? node.locations : null;
  return node.colors.map((color, index) => {
    const paint = splitGradientAlpha(color);
    return {
      offset: located ? located[index]! : count === 1 ? 0 : index / (count - 1),
      color: paint.color,
      opacity: paint.opacity,
    };
  });
}

export function splitGradientAlpha(color: string): {
  color: string;
  opacity: number;
} {
  const trimmed = color.trim();
  if (trimmed.toLowerCase() === "transparent") {
    return { color: "#000000", opacity: 0 };
  }
  const hex8 = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})$/.exec(trimmed);
  if (hex8) {
    return {
      color: `#${hex8[1]}`,
      opacity: Number.parseInt(hex8[2]!, 16) / 255,
    };
  }
  return { color: trimmed, opacity: 1 };
}

/** expo-linear-gradient's default axis: top to bottom. */
export function uiIrGradientAxis(
  node: Pick<GradientNode, "start" | "end">,
): { x1: number; y1: number; x2: number; y2: number } {
  const start = node.start ?? { x: 0.5, y: 0 };
  const end = node.end ?? { x: 0.5, y: 1 };
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
}

/** An id an SVG `url(#…)` reference can name; node ids carry colons. */
export function uiIrGradientElementId(nodeId: string): string {
  return `onborn-gradient-${nodeId.replace(/[^A-Za-z0-9_-]/g, "-")}`;
}

/**
 * The corner radius the painted rectangle should share with its box.
 *
 * The vector layer is not clipped by the View's borderRadius on every
 * platform, so a uniform radius is drawn into the rectangle itself. Per-corner
 * radii have no rectangle equivalent and are left to the box.
 */
export function uiIrGradientCornerRadius(
  style: BuilderV2UiIrStyle | undefined,
): number | undefined {
  if (!style) return undefined;
  const perCorner = Object.keys(style).some(
    (key) => key.startsWith("border") && key.endsWith("Radius") && key !== "borderRadius",
  );
  const radius = style.borderRadius;
  return !perCorner && typeof radius === "number" && radius > 0
    ? radius
    : undefined;
}
