import React from "react";
import { mapPrimitivesToSlots } from "./mapPrimitivesToSlots";
import { renderPrimitive } from "./renderPrimitive";
import { wrapSelectableNode } from "./selectable";
import type { PrimitiveInstance, PrimitiveRenderOptions, SlottedNodes } from "./types";

function mapSlotToNodes(
  instances: PrimitiveInstance[],
  options?: PrimitiveRenderOptions,
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  for (const [i, p] of instances.entries()) {
    const node = renderPrimitive(p, options);
    if (node == null) {
      continue;
    }
    const key = `${p.id ?? p.type}-${p.type}-${p.order}-${i}`;
    const primitiveId = p.id ?? p.type;
    out.push(wrapSelectableNode(key, primitiveId, node, options));
  }
  return out;
}

function isHeroOverlayPrimitive(primitive: PrimitiveInstance): boolean {
  return (
    primitive.slot === "hero" &&
    (primitive.type === "x_stack" || primitive.type === "y_stack") &&
    primitive.props.overlay === true
  );
}

function heroOverlayPlacement(
  primitive: PrimitiveInstance,
): "top" | "bottom" {
  return primitive.props.overlayPlacement === "bottom" ? "bottom" : "top";
}

/** Maps primitives to ordered slot buckets, then renders each bucket. */
export function renderScreen(
  primitives: PrimitiveInstance[],
  options?: PrimitiveRenderOptions,
): SlottedNodes {
  const slots = mapPrimitivesToSlots(primitives);
  const heroOverlay = slots.hero.filter(isHeroOverlayPrimitive);
  const heroNormal = slots.hero.filter(
    (primitive) => !isHeroOverlayPrimitive(primitive),
  );
  return {
    top: mapSlotToNodes(slots.top, options),
    hero: mapSlotToNodes(heroNormal, options),
    heroOverlayTop: mapSlotToNodes(
      heroOverlay.filter(
        (primitive) => heroOverlayPlacement(primitive) === "top",
      ),
      options,
    ),
    heroOverlayBottom: mapSlotToNodes(
      heroOverlay.filter(
        (primitive) => heroOverlayPlacement(primitive) === "bottom",
      ),
      options,
    ),
    content: mapSlotToNodes(slots.content, options),
    bottom: mapSlotToNodes(slots.bottom, options),
  };
}
