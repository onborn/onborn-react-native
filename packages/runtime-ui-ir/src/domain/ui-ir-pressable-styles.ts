import type { BuilderV2UiIrNode } from "@onborn/sdk-contracts/builder-v2-ui-ir";

type Style = Record<string, unknown> | undefined;
type PressableNode = Extract<BuilderV2UiIrNode, { type: "pressable" }>;

/**
 * Which box a pressable's styles belong to.
 *
 * A pressable renders as an animated wrapper (press feedback: scale, opacity)
 * around the actual Pressable that holds the children. Two source idioms
 * compile into it:
 *
 * - A plain `<Pressable style={...}>`: the pressable *is* the layout container,
 *   so its style — flexDirection, gap, padding — must land on the inner box the
 *   children live in. Putting it on the wrapper stacked a quiz option's radio
 *   above its label on the device while the builder, rendering the real
 *   source, showed them side by side.
 *
 * - The Animated.View-wrapping idiom, recognisable by `contentStyle`: the
 *   node's style described the outer Animated.View in the source, and
 *   contentStyle the inner Pressable, so the split is preserved exactly.
 *
 * The held (pressed) style always travels with the node's own style: it
 * overrides that object, so it must merge into the same box.
 */
export function placeUiIrPressableStyles(input: {
  style: Style;
  pressedStyle: Style;
  contentStyle: PressableNode["contentStyle"];
  pressed: boolean;
}): { container: Style[]; pressable: Style[] } {
  const held = input.pressed ? input.pressedStyle : undefined;
  if (input.contentStyle === undefined) {
    return { container: [], pressable: [input.style, held] };
  }
  return {
    container: [input.style, held],
    pressable: [input.contentStyle],
  };
}
