import type { PrimitiveInstance, Slot } from "./types";

function isSlot(value: unknown): value is Slot {
  return (
    value === "top" ||
    value === "hero" ||
    value === "content" ||
    value === "bottom"
  );
}

/**
 * Flattens a step `primitives` map (keyed entries with `type` / `slot` / `order` / `visible` / `props`)
 * into a list for {@link mapPrimitivesToSlots}. Works for any funnel step that uses this shape.
 */
export function primitivesMapToInstances<T extends object>(primitives: T | undefined | null): PrimitiveInstance[] {
  const out: PrimitiveInstance[] = [];
  if (!primitives || typeof primitives !== "object") {
    return out;
  }
  for (const [key, value] of Object.entries(primitives)) {
    if (!value || typeof value !== "object") {
      continue;
    }
    const rec = value as Record<string, unknown>;
    const slot = rec.slot;
    const type = rec.type;
    const order = rec.order;
    const props = rec.props;
    if (typeof type !== "string" || !isSlot(slot) || typeof order !== "number" || !props || typeof props !== "object") {
      continue;
    }
    out.push({
      id: key,
      type,
      slot,
      order,
      visible: typeof rec.visible === "boolean" ? rec.visible : undefined,
      visibility: isPrimitiveVisibility(rec.visibility)
        ? rec.visibility
        : undefined,
      props: props as Record<string, unknown>,
    });
  }
  return out;
}

function isPrimitiveVisibility(value: unknown): value is {
  mode: "all" | "include_steps" | "exclude_steps";
  stepIds?: string[];
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (
    record.mode !== "all" &&
    record.mode !== "include_steps" &&
    record.mode !== "exclude_steps"
  ) {
    return false;
  }
  return (
    !Array.isArray(record.stepIds) ||
    record.stepIds.every((stepId) => typeof stepId === "string")
  );
}
