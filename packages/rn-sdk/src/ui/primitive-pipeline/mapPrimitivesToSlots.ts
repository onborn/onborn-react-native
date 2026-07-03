import type { PrimitiveInstance, Slot, SlotMap } from "./types";

export function mapPrimitivesToSlots(primitives: PrimitiveInstance[]): SlotMap {
  const slots: SlotMap = {
    top: [],
    hero: [],
    content: [],
    bottom: [],
  };

  for (const primitive of primitives) {
    if (primitive.visible === false) {
      continue;
    }
    const slot = primitive.slot;
    if (
      slot !== "top" &&
      slot !== "hero" &&
      slot !== "content" &&
      slot !== "bottom"
    ) {
      continue;
    }
    slots[slot].push(primitive);
  }

  (Object.keys(slots) as Slot[]).forEach((slot) => {
    slots[slot].sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      // Deterministic tie-break on the primitive key so the canvas render order
      // matches the builder's left-panel list when two primitives share an order.
      return (a.id ?? "").localeCompare(b.id ?? "");
    });
  });

  return slots;
}
