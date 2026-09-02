import type { BuilderV2UiIrStyle } from "@onborn/sdk-contracts/builder-v2-ui-ir";

/**
 * Reconciles Yoga's aspect-ratio semantics with the web's.
 *
 * The same style — `width: "100%"`, `aspectRatio`, `maxHeight` — lays out
 * differently on the two engines the platform renders with. CSS keeps the
 * declared width and only clamps the height, so a contained image centres in
 * a full-width band; Yoga treats the aspect ratio as bidirectional and, once
 * the max clamps one axis, recomputes the other — the box narrows and, in a
 * stretch parent, packs to the start. The builder's canvas is the web engine,
 * so the web layout is what was approved.
 *
 * Centring the narrowed box reproduces the approved visual: on the web an
 * `alignSelf: "center"` on a full-width box changes nothing, on the device it
 * puts the Yoga-narrowed box where the web's contained content already sat.
 * Applied only when the style declares no alignment of its own.
 */
export function reconcileUiIrYogaAspectRatio(
  style: BuilderV2UiIrStyle | undefined,
): BuilderV2UiIrStyle | undefined {
  if (!style || typeof style !== "object") {
    return style;
  }
  const record = style as Record<string, unknown>;
  if (typeof record.aspectRatio !== "number" || record.alignSelf !== undefined) {
    return style;
  }
  const percentWidth =
    typeof record.width === "string" && record.width.trim().endsWith("%");
  const percentHeight =
    typeof record.height === "string" && record.height.trim().endsWith("%");
  const clamped =
    (percentWidth && record.maxHeight !== undefined) ||
    (percentHeight && record.maxWidth !== undefined);
  if (!clamped) {
    return style;
  }
  return { ...style, alignSelf: "center" } as BuilderV2UiIrStyle;
}
