import assert from "node:assert/strict";
import test from "node:test";

import { resolveUiIrNextPosition } from "./ui-ir-navigation";

const screens = [
  { screenId: "fit" as const, next: [
    { to: "fitBeginner", when: { state: "fit", equals: "beginner" } },
    { to: "fitAdvanced", when: { state: "fit", equals: "advanced" } },
    { to: "fitAverage" },
  ] },
  { screenId: "fitBeginner", next: [{ to: "reserves" }] },
  { screenId: "fitAverage", next: [{ to: "reserves" }] },
  { screenId: "fitAdvanced" },
  { screenId: "reserves" },
];

test("the first route whose answer holds wins, the unconditional one is the default", () => {
  assert.equal(resolveUiIrNextPosition({ screens, position: 0, values: { fit: "beginner" } }), 1);
  assert.equal(resolveUiIrNextPosition({ screens, position: 0, values: { fit: "advanced" } }), 3);
  assert.equal(resolveUiIrNextPosition({ screens, position: 0, values: { fit: "elite" } }), 2);
  assert.equal(resolveUiIrNextPosition({ screens, position: 0, values: {} }), 2);
});

test("a branch rejoins the main path, and no route means the next screen", () => {
  assert.equal(resolveUiIrNextPosition({ screens, position: 1, values: {} }), 4);
  assert.equal(resolveUiIrNextPosition({ screens, position: 3, values: {} }), 4);
  assert.equal(resolveUiIrNextPosition({ screens, position: 4, values: {} }), null);
});
