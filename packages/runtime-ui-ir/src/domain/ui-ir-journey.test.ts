import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { BuilderV2UiIrDocument } from "@onborn/sdk-contracts";

import {
  createUiIrJourneyController,
  type UiIrJourneyEvent,
} from "./ui-ir-journey";

describe("UI IR journey", () => {
  it("navigates document order and opens a declared paywall placement", () => {
    const events: UiIrJourneyEvent[] = [];
    const controller = createUiIrJourneyController({
      document: documentFixture(),
      onComplete: () => events.push({
        type: "journey.completed",
        screenId: "host",
      }),
      onDismiss: () => undefined,
      onEvent: (event) => events.push(event),
    });

    controller.start();
    controller.next();
    assert.equal(controller.getState().activeScreenId, "goal");
    controller.openPlacement("onboarding-complete");
    assert.equal(controller.getState().activeScreenId, "premium");
    assert.ok(events.some((event) => event.type === "paywall.viewed"));
  });

  it("rejects an undeclared paywall placement", () => {
    const controller = createUiIrJourneyController({
      document: documentFixture(),
      onComplete: () => undefined,
      onDismiss: () => undefined,
    });
    assert.throws(
      () => controller.openPlacement("missing"),
      /is not declared/,
    );
  });
});

function documentFixture(): BuilderV2UiIrDocument {
  return {
    schemaVersion: 1,
    format: "onborn-ui-ir-v1",
    entryScreenId: "welcome",
    screens: [
      screen("welcome", "onboarding"),
      screen("goal", "onboarding"),
      {
        ...screen("premium", "paywall"),
        placement: "onboarding-complete",
      },
    ],
    assets: [],
  };
}

function screen(
  screenId: string,
  surface: "onboarding" | "paywall",
): BuilderV2UiIrDocument["screens"][number] {
  return {
    screenId,
    surface,
    root: { id: `${screenId}.root`, type: "view", children: [] },
  };
}
