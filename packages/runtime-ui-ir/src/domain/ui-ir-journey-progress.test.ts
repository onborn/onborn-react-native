import assert from "node:assert/strict";
import test from "node:test";

import { uiIrJourneyProgress } from "./ui-ir-journey-progress";

test("the bar walks from `from` on the first screen to full on the last", () => {
  assert.equal(uiIrJourneyProgress({ position: 0, total: 4 }), 0);
  assert.equal(uiIrJourneyProgress({ position: 3, total: 4 }), 1);
  assert.equal(uiIrJourneyProgress({ position: 0, total: 4, from: 0.2 }), 0.2);
  assert.equal(
    Math.round(uiIrJourneyProgress({ position: 1, total: 4, from: 0.2 }) * 1000),
    467,
  );
});

test("a one-screen journey is complete, and nonsense clamps", () => {
  assert.equal(uiIrJourneyProgress({ position: 0, total: 1 }), 1);
  assert.equal(uiIrJourneyProgress({ position: 9, total: 3 }), 1);
  assert.equal(uiIrJourneyProgress({ position: 0, total: 3, from: 4 }), 1);
});
