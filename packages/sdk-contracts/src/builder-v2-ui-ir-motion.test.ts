import assert from "node:assert/strict";
import test from "node:test";

import {
  BuilderV2UiIrEnterTransitionSchema,
  BuilderV2UiIrLayoutTransitionSchema,
} from "./builder-v2-ui-ir-motion";

test("accepts a bounded Reanimated entrance transition", () => {
  assert.deepEqual(
    BuilderV2UiIrEnterTransitionSchema.parse({
      type: "reanimated",
      preset: "ZoomInRotate",
      durationMs: 240,
      delayMs: 80,
      spring: {
        damping: 18,
        stiffness: 140,
        mass: 0.9,
        energyThreshold: 0.001,
      },
    }),
    {
      type: "reanimated",
      preset: "ZoomInRotate",
      durationMs: 240,
      delayMs: 80,
      spring: {
        damping: 18,
        stiffness: 140,
        mass: 0.9,
        energyThreshold: 0.001,
      },
    },
  );
});

test("rejects spring modifiers on incompatible Reanimated layout presets", () => {
  const result = BuilderV2UiIrLayoutTransitionSchema.safeParse({
    type: "reanimated",
    preset: "FadingTransition",
    spring: { damping: 18 },
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues[0]?.message ?? "", /LinearTransition/);
  }
});
