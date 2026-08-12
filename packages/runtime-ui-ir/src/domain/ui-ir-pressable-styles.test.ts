import assert from "node:assert/strict";
import test from "node:test";

import { placeUiIrPressableStyles } from "./ui-ir-pressable-styles";

/*
 * From a live mismatch: the same quiz screen showed its radio beside the label
 * on the builder canvas and above it on the device. The canvas renders the
 * source; the device renders the IR, and the runtime had put the node's row
 * layout on the feedback wrapper while the children lived one box deeper.
 */
test("a plain pressable keeps its layout on the box the children live in", () => {
  const placed = placeUiIrPressableStyles({
    style: { flexDirection: "row", gap: 12 },
    pressedStyle: { opacity: 0.8 },
    contentStyle: undefined,
    pressed: false,
  });

  assert.deepEqual(placed.container, []);
  assert.deepEqual(placed.pressable, [
    { flexDirection: "row", gap: 12 },
    undefined,
  ]);
});

test("the held style rides with the style it overrides", () => {
  const placed = placeUiIrPressableStyles({
    style: { backgroundColor: "#000" },
    pressedStyle: { backgroundColor: "#333" },
    contentStyle: undefined,
    pressed: true,
  });

  assert.deepEqual(placed.pressable, [
    { backgroundColor: "#000" },
    { backgroundColor: "#333" },
  ]);
});

test("the animated idiom keeps its source split", () => {
  // contentStyle exists only when the source wrapped a Pressable in an
  // Animated.View; each style stays on the box it described.
  const placed = placeUiIrPressableStyles({
    style: { transform: [] },
    pressedStyle: undefined,
    contentStyle: { padding: 16 },
    pressed: false,
  });

  assert.deepEqual(placed.container, [{ transform: [] }, undefined]);
  assert.deepEqual(placed.pressable, [{ padding: 16 }]);
});
