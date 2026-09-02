import assert from "node:assert/strict";
import test from "node:test";

import { uiIrScreenEnterTransition } from "./ui-ir-screen-transition";

test("the default is a rise from below, and a plain fade on the way back", () => {
  assert.deepEqual(
    uiIrScreenEnterTransition({ document: {}, screen: {}, direction: "forward" }),
    { type: "reanimated", preset: "FadeInDown", durationMs: 280 },
  );
  assert.deepEqual(
    uiIrScreenEnterTransition({ document: {}, screen: {}, direction: "back" }),
    { type: "reanimated", preset: "FadeIn", durationMs: 280 },
  );
});

test("the screen's transition wins over the flow's, which wins over the default", () => {
  const document = { transitions: { screen: { kind: "slide" as const, durationMs: 200 } } };
  assert.deepEqual(
    uiIrScreenEnterTransition({ document, screen: {}, direction: "forward" }),
    { type: "reanimated", preset: "SlideInRight", durationMs: 200 },
  );
  assert.deepEqual(
    uiIrScreenEnterTransition({ document, screen: {}, direction: "back" }),
    { type: "reanimated", preset: "SlideInLeft", durationMs: 200 },
  );
  assert.equal(
    uiIrScreenEnterTransition({
      document,
      screen: { transition: { kind: "none" } },
      direction: "forward",
    }),
    null,
  );
  assert.deepEqual(
    uiIrScreenEnterTransition({
      document,
      screen: { transition: { kind: "fade" } },
      direction: "forward",
    }),
    { type: "reanimated", preset: "FadeIn", durationMs: 280 },
  );
});
