import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readUiIrOfferingKey } from "./ui-ir-offering";

describe("readUiIrOfferingKey", () => {
  it("finds the offering a paywall screen names", () => {
    assert.equal(
      readUiIrOfferingKey(document([{ billing: { offeringKey: "launch" } }])),
      "launch",
    );
  });

  it("falls back to the environment's current offering", () => {
    // Every flow published before paywalls could choose has no key, and must
    // keep getting exactly what it got before.
    assert.equal(readUiIrOfferingKey(document([{}])), undefined);
    assert.equal(readUiIrOfferingKey(document([{ billing: {} }])), undefined);
  });
});

function document(
  paywalls: Array<{ billing?: { offeringKey?: string } }>,
): Parameters<typeof readUiIrOfferingKey>[0] {
  return {
    screens: paywalls.map((paywall, index) => ({
      screenId: `paywall-${index}`,
      surface: "paywall" as const,
      ...paywall,
    })),
  };
}
