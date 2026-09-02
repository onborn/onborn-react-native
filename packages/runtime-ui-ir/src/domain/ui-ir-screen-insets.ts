import type { BuilderV2UiIrNode } from "@onborn/sdk-contracts/builder-v2-ui-ir";

/**
 * Whether the runtime should keep a screen's content out of the device's
 * unsafe bands (status bar, home indicator).
 *
 * The dialect's rule is that a screen owns its own safe-area handling: a
 * full-bleed hero deliberately reaches the physical top edge, and wrapping it
 * would paint a background strip above the artwork. But screens are authored
 * and validated on a notchless 402×874 canvas, so a plain solid-background
 * screen that starts its chrome at y=16 looks right there and collides with
 * the clock on a real device. The runtime steps in exactly for that case.
 *
 * Edge-to-edge (the runtime stays out of it) when:
 * - the root IS a safe-area-view — the screen already handles insets;
 * - the root or any direct child is an image-background — a bleed is the
 *   design, and the screen places its own content clear of the notch;
 * - any direct child is absolutely positioned — an overlay composition that
 *   manages its own offsets.
 *
 * Everything else — the common solid-background content screen — gets the
 * device's insets added around it.
 */
export function uiIrScreenWantsInsets(root: BuilderV2UiIrNode): boolean {
  if (root.type === "safe-area-view" || isBleed(root)) {
    return false;
  }
  const children = "children" in root ? (root.children ?? []) : [];
  for (const child of children) {
    if (isBleed(child)) {
      return false;
    }
    const position =
      child.style && typeof child.style === "object"
        ? (child.style as { position?: unknown }).position
        : undefined;
    if (position === "absolute") {
      return false;
    }
  }
  return true;
}

/** Artwork or a colour ramp meant to reach the physical edge. */
function isBleed(node: BuilderV2UiIrNode): boolean {
  return node.type === "image-background" || node.type === "linear-gradient";
}
