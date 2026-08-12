import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveUiIrPlan,
  resolveUiIrPlanField,
  uiIrPlanConditionHolds,
  type UiIrPlanSnapshot,
} from "./ui-ir-plans";

const snapshot: UiIrPlanSnapshot = {
  status: "ready",
  plans: [
    { id: "monthly", title: "Monthly", price: "$9.99", period: "month" },
    {
      id: "annual",
      title: "Annual",
      price: "$59.99",
      period: "year",
      trial: "7 days free",
    },
  ],
};

describe("plan bindings", () => {
  it("reads a field from the plan at a slot", () => {
    assert.equal(
      resolveUiIrPlanField(snapshot, { slot: 1 }, "price", null),
      "$59.99",
    );
  });

  it("renders nothing rather than a price nobody has loaded", () => {
    /*
     * The single rule this whole mechanism exists for: a paywall must never
     * show a number that is not the one being charged. While the offering is
     * loading, or when the store is unreachable, the honest output is empty.
     */
    for (const loading of [
      { status: "loading", plans: [] },
      { status: "unavailable", plans: [] },
    ] as UiIrPlanSnapshot[]) {
      assert.equal(
        resolveUiIrPlanField(loading, { slot: 0 }, "price", null),
        "",
      );
    }
    assert.equal(
      resolveUiIrPlanField(snapshot, { slot: 5 }, "price", null),
      "",
    );
    assert.equal(
      resolveUiIrPlanField(snapshot, { slot: 0 }, "trial", null),
      "",
    );
  });

  it("resolves the current plan inside a repeat", () => {
    assert.equal(
      resolveUiIrPlanField(snapshot, { current: true }, "title", 1),
      "Annual",
    );
    // Outside a repeat there is no current plan, and inventing the first one
    // would put the wrong price under the wrong button.
    assert.equal(
      resolveUiIrPlanField(snapshot, { current: true }, "title", null),
      "",
    );
  });

  it("a plan predicate answers whether the offering has that plan", () => {
    assert.equal(
      uiIrPlanConditionHolds(snapshot, { plan: { slot: 1 } }, null),
      true,
    );
    assert.equal(
      uiIrPlanConditionHolds(snapshot, { plan: { slot: 2 } }, null),
      false,
    );
    assert.equal(
      uiIrPlanConditionHolds(
        snapshot,
        { plan: { slot: 2 }, negate: true },
        null,
      ),
      true,
    );
  });

  it("a plan is addressable for purchase by slot and by selection", () => {
    assert.equal(resolveUiIrPlan(snapshot, { slot: 0 }, null)?.id, "monthly");
    // The selection state holds the slot the person tapped, as a string —
    // the only shape screen state can carry.
    assert.equal(
      resolveUiIrPlan(snapshot, { slot: Number("1") }, null)?.id,
      "annual",
    );
  });
});
