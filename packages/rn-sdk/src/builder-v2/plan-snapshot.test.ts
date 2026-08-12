import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createBuilderV2PlanSnapshot } from "./plan-snapshot";

describe("createBuilderV2PlanSnapshot", () => {
  it("keeps the offering's order, because a plan slot is a position in it", () => {
    const snapshot = createBuilderV2PlanSnapshot({
      loading: false,
      packages: [
        pack("monthly", { price: "29,99 zł", billingPeriod: "month" }),
        pack("annual", { price: "199,99 zł", billingPeriod: "year" }),
      ],
    });

    assert.equal(snapshot.status, "ready");
    assert.deepEqual(
      snapshot.plans.map((plan) => plan.id),
      ["monthly", "annual"],
    );
    // The store's own localized string, never a reformatted one: the paywall
    // must show exactly what the person will be charged.
    assert.equal(snapshot.plans[0]?.price, "29,99 zł");
  });

  it("offers a plan without a price rather than no plan", () => {
    // Store localization can lag the offering. The row still renders its
    // title; the price binding stays empty until the store answers.
    const snapshot = createBuilderV2PlanSnapshot({
      loading: false,
      packages: [pack("monthly", undefined)],
    });

    assert.equal(snapshot.plans[0]?.id, "monthly");
    assert.equal(snapshot.plans[0]?.price, undefined);
  });

  it("reports loading and unavailable apart", () => {
    /*
     * A paywall must be able to tell "prices are on their way" from "this
     * device cannot buy anything" — the first is a spinner, the second is a
     * screen that should not claim to sell.
     */
    assert.equal(
      createBuilderV2PlanSnapshot({ loading: true, packages: [] }).status,
      "loading",
    );
    assert.equal(
      createBuilderV2PlanSnapshot({ loading: false, packages: [] }).status,
      "unavailable",
    );
  });
});

function pack(
  id: string,
  product: { price?: string; billingPeriod?: string } | undefined,
) {
  return {
    package: { id, productId: `${id}.product`, label: id },
    ...(product ? { product } : {}),
  } as Parameters<typeof createBuilderV2PlanSnapshot>[0]["packages"][number];
}
