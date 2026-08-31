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

describe("one offering per presentation", () => {
  const mixed = {
    screens: [
      { screenId: "welcome", surface: "onboarding" as const },
      {
        screenId: "premium",
        surface: "paywall" as const,
        billing: { offeringKey: "standard" },
      },
      {
        screenId: "winback",
        surface: "paywall" as const,
        placement: "winback",
        standalone: true as const,
        billing: { offeringKey: "discounted" },
      },
    ],
  };

  it("loads the journey's own offering", () => {
    // Not the standalone screen's, though it is in the same document: the
    // journey never renders it, so its offering is not the journey's to load.
    assert.equal(readUiIrOfferingKey(mixed), "standard");
  });

  it("loads a presented paywall's offering", () => {
    assert.equal(
      readUiIrOfferingKey(mixed, { placement: "winback" }),
      "discounted",
    );
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
