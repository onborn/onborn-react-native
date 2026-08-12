import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BuilderV2ProjectManifestSchema,
  BuilderV2UiIrDocumentSchema,
  BuilderV2UiIrActionSchema,
  BuilderV2UiIrNodeSchema,
  BuilderV2UiIrTextSchema,
} from "./index";

describe("paywall bindings", () => {
  it("a price is described, never carried", () => {
    /*
     * The whole point of the binding: an artifact cannot hold a price, because
     * the price belongs to the store and to the viewer's currency. A binding
     * that accepted a fallback would let a model write one in anyway, which is
     * exactly the invented "$9.99" this replaces.
     */
    const price = BuilderV2UiIrTextSchema.parse({
      kind: "billing",
      plan: { slot: 1 },
      field: "price",
    });

    assert.equal(price.kind === "billing" && price.field, "price");
    assert.equal(
      BuilderV2UiIrTextSchema.safeParse({
        kind: "billing",
        plan: { slot: 1 },
        field: "price",
        fallback: "$9.99",
      }).success,
      false,
    );
  });

  it("a purchase names exactly one source", () => {
    for (const source of [
      { packageId: "annual" },
      { plan: { slot: 0 } },
      { planFromState: "selectedPlan" },
    ]) {
      assert.equal(
        BuilderV2UiIrActionSchema.safeParse({
          type: "billing.purchase",
          source,
        }).success,
        true,
      );
    }
    assert.equal(
      BuilderV2UiIrActionSchema.safeParse({
        type: "billing.purchase",
        source: { packageId: "annual", planFromState: "selectedPlan" },
      }).success,
      false,
    );
  });

  it("a link carries a resolved absolute URL", () => {
    assert.equal(
      BuilderV2UiIrActionSchema.safeParse({
        type: "link.open",
        url: "https://onborn.app/terms",
      }).success,
      true,
    );
    // "terms" is a manifest key, not an address; resolving it is the
    // compiler's job so the runtime never has to look anything up.
    assert.equal(
      BuilderV2UiIrActionSchema.safeParse({ type: "link.open", url: "terms" })
        .success,
      false,
    );
  });

  it("a plan repeat is bounded", () => {
    // The only node whose child count is unknown at publish time, so the
    // document still has to state a worst case a reviewer can read off it.
    const node = {
      id: "paywall.plans",
      type: "billing-plans" as const,
      limit: 3,
      children: [],
    };

    assert.equal(BuilderV2UiIrNodeSchema.safeParse(node).success, true);
    assert.equal(
      BuilderV2UiIrNodeSchema.safeParse({ ...node, limit: undefined }).success,
      false,
    );
  });

  it("presence accepts a plan predicate as well as a selection", () => {
    // A paywall laying out three plans against an offering with two must be
    // able to hide the third, without a state value nobody sets.
    assert.equal(
      BuilderV2UiIrNodeSchema.safeParse({
        id: "paywall.plan.2",
        type: "view",
        presence: { plan: { slot: 2 } },
        children: [],
      }).success,
      true,
    );
  });
});

describe("one offering per flow", () => {
  it("refuses a document whose paywalls name different offerings", () => {
    /*
     * The host loads one offering before anything renders, so two paywalls
     * naming different ones cannot both be right — one would sell the other's
     * plans at the other's prices, and nobody would see it until a charge.
     */
    const result = BuilderV2UiIrDocumentSchema.safeParse(
      uiIrDocument(["launch", "standard"]),
    );

    assert.equal(result.success, false);
    assert.match(
      result.success ? "" : result.error.issues[0]!.message,
      /A flow sells one offering/,
    );
  });

  it("accepts the same offering named by several paywalls", () => {
    assert.equal(
      BuilderV2UiIrDocumentSchema.safeParse(uiIrDocument(["launch", "launch"]))
        .success,
      true,
    );
  });
});

function uiIrDocument(offeringKeys: string[]) {
  return {
    schemaVersion: 1,
    format: "onborn-ui-ir-v1",
    entryScreenId: "paywall-0",
    assets: [],
    screens: offeringKeys.map((offeringKey, index) => ({
      screenId: `paywall-${index}`,
      surface: "paywall",
      billing: { offeringKey },
      root: { id: `paywall-${index}.root`, type: "view", children: [] },
    })),
  };
}

describe("paywall project settings", () => {
  const base = {
    schemaVersion: 1 as const,
    entryScreenId: "start",
    screens: [
      {
        screenId: "start",
        file: "screens/StartScreen.tsx",
        surface: "onboarding",
      },
    ],
  };

  it("legal addresses belong to the project", () => {
    const manifest = BuilderV2ProjectManifestSchema.parse({
      ...base,
      legal: {
        termsUrl: "https://onborn.app/terms",
        privacyUrl: "https://onborn.app/privacy",
      },
    });

    assert.equal(manifest.legal?.termsUrl, "https://onborn.app/terms");
  });

  it("an offering can only be chosen by a paywall screen", () => {
    // Settings on an onboarding screen would silently do nothing, which is
    // worse than being told the setting does not belong there.
    assert.equal(
      BuilderV2ProjectManifestSchema.safeParse({
        ...base,
        screens: [
          {
            screenId: "start",
            file: "screens/StartScreen.tsx",
            surface: "onboarding",
            paywall: { offeringKey: "launch" },
          },
        ],
      }).success,
      false,
    );
  });
});
