import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  readUiIrOfferingKey,
  readUiIrSamplePlans,
  withUiIrSamplePlans,
} from "./ui-ir-offering";

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

describe("sample plans when no offering loads", () => {
  const samples = [
    { title: "Monthly", price: "$9.99", period: "per month" },
    { title: "Yearly", price: "$4.99", period: "per month", badge: "Save 50%" },
  ];
  const designed = {
    screens: [
      { screenId: "welcome", surface: "onboarding" as const },
      {
        screenId: "premium",
        surface: "paywall" as const,
        billing: { samplePlans: samples },
      },
      {
        screenId: "winback",
        surface: "paywall" as const,
        placement: "winback",
        standalone: true as const,
        billing: { samplePlans: [{ title: "Comeback", price: "$1" }] },
      },
    ],
  };

  it("reads the presented paywall's designed plans with positional ids", () => {
    assert.deepEqual(readUiIrSamplePlans(designed), [
      { id: "sample-0", title: "Monthly", price: "$9.99", period: "per month" },
      {
        id: "sample-1",
        title: "Yearly",
        price: "$4.99",
        period: "per month",
        badge: "Save 50%",
      },
    ]);
    assert.deepEqual(
      readUiIrSamplePlans(designed, { placement: "winback" })?.map(
        (plan) => plan.title,
      ),
      ["Comeback"],
    );
    assert.equal(readUiIrSamplePlans(document([{ billing: {} }])), undefined);
  });

  it("stands in only for an offering that could not be loaded", () => {
    const plans = readUiIrSamplePlans(designed);
    assert.deepEqual(
      withUiIrSamplePlans({ status: "unavailable", plans: [] }, plans),
      { status: "sample", plans },
    );
    // Loading keeps its blank rows; a loaded offering is never second-guessed.
    const loading = { status: "loading" as const, plans: [] };
    assert.equal(withUiIrSamplePlans(loading, plans), loading);
    const ready = {
      status: "ready" as const,
      plans: [{ id: "pkg_1", title: "Annual", price: "$59.99" }],
    };
    assert.equal(withUiIrSamplePlans(ready, plans), ready);
    // A screen that designed nothing stays honestly empty.
    const unavailable = { status: "unavailable" as const, plans: [] };
    assert.equal(withUiIrSamplePlans(unavailable, undefined), unavailable);
  });
});
