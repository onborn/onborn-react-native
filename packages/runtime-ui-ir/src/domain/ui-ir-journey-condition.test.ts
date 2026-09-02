import assert from "node:assert/strict";
import test from "node:test";

import { uiIrJourneyConditionHolds } from "./ui-ir-state";

test("the chrome's predicates read where the journey stands", () => {
  const first = { isFirst: true, isLast: false, variant: null };
  const outro = { isFirst: false, isLast: false, variant: "outro" };
  assert.equal(uiIrJourneyConditionHolds(first, { journey: "isFirst" }), true);
  assert.equal(
    uiIrJourneyConditionHolds(first, { journey: "isFirst", negate: true }),
    false,
  );
  assert.equal(uiIrJourneyConditionHolds(outro, { journey: "isLast" }), false);
  assert.equal(
    uiIrJourneyConditionHolds(outro, { journey: "variant", equals: "outro" }),
    true,
  );
  assert.equal(
    uiIrJourneyConditionHolds(first, { journey: "variant", equals: "outro" }),
    false,
  );
  assert.equal(
    uiIrJourneyConditionHolds(first, { journey: "variant", equals: null }),
    true,
  );
});

test("outside a journey nothing holds", () => {
  assert.equal(uiIrJourneyConditionHolds(undefined, { journey: "isFirst" }), false);
  assert.equal(
    uiIrJourneyConditionHolds(undefined, { journey: "isFirst", negate: true }),
    true,
  );
});
