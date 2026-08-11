import assert from "node:assert/strict";
import test from "node:test";

import { initialUiIrStateValues, uiIrConditionHolds } from "./ui-ir-state";

test("a screen starts at its declared initial values", () => {
  assert.deepEqual(
    initialUiIrStateValues({
      state: { answer: { initial: null }, plan: { initial: "yearly" } },
    }),
    { answer: null, plan: "yearly" },
  );
  assert.deepEqual(initialUiIrStateValues({}), {});
});

test("equality and its negation are the whole predicate", () => {
  const values = { answer: "move" };

  assert.equal(
    uiIrConditionHolds(values, { state: "answer", equals: "move" }),
    true,
  );
  assert.equal(
    uiIrConditionHolds(values, { state: "answer", equals: "rest" }),
    false,
  );
  assert.equal(
    uiIrConditionHolds(values, { state: "answer", equals: null, negate: true }),
    true,
  );
});

test("a condition over an undeclared state reads as null, not as a crash", () => {
  // Publish-time validation makes this unreachable from a real artifact; a
  // hand-built document should still degrade rather than throw on a device.
  assert.equal(uiIrConditionHolds({}, { state: "ghost", equals: null }), true);
  assert.equal(uiIrConditionHolds({}, { state: "ghost", equals: "x" }), false);
});
