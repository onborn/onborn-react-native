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

  /*
   * A standalone paywall ships in the same artifact as the flow it belongs to
   * and is opened by the app, so the journey must not walk into it: an
   * onboarding would end on a purchase screen nobody routed to, and every
   * "step 2 of 4" before it would have been counting a screen never seen.
   */
  it("walks past a standalone paywall", () => {
    const controller = createUiIrJourneyController({
      document: standaloneFixture(),
      onComplete: () => undefined,
      onDismiss: () => undefined,
    });

    controller.start();
    assert.equal(controller.getState().total, 2);
    controller.next();
    assert.equal(controller.getState().activeScreenId, "goal");
    assert.equal(controller.getState().isLast, true);
  });

  it("says why a standalone placement cannot be opened from a journey", () => {
    const controller = createUiIrJourneyController({
      document: standaloneFixture(),
      onComplete: () => undefined,
      onDismiss: () => undefined,
    });

    assert.throws(
      () => controller.openPlacement("settings-upsell"),
      /present it from the app/,
    );
  });

  it("presents a standalone paywall as the whole presentation", () => {
    const events: UiIrJourneyEvent[] = [];
    let dismissed = false;
    const controller = createUiIrJourneyController({
      document: standaloneFixture(),
      placement: "settings-upsell",
      onComplete: () => undefined,
      onDismiss: () => {
        dismissed = true;
      },
      onEvent: (event) => events.push(event),
    });

    controller.start();
    const state = controller.getState();
    // One screen, first and last: there is nothing to go back to and nothing
    // after it, because the app opened this and the app closes it.
    assert.equal(state.activeScreenId, "upsell");
    assert.equal(state.total, 1);
    assert.equal(state.isFirst, true);
    assert.equal(state.isLast, true);
    assert.ok(
      events.some(
        (event) =>
          event.type === "paywall.viewed" &&
          event.placement === "settings-upsell",
      ),
    );

    controller.dismiss();
    assert.equal(dismissed, true);
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

  /*
   * One artifact, two compositions: the app skips web-only screens and the
   * funnel skips app-only ones, off the same document. A host that names no
   * channel — the canvas preview — walks everything.
   */
  it("filters the journey to its channel", () => {
    const channelled: BuilderV2UiIrDocument = {
      schemaVersion: 1,
      format: "onborn-ui-ir-v1",
      entryScreenId: "welcome",
      screens: [
        { ...screen("welcome", "onboarding"), channels: ["app"] },
        screen("quiz", "onboarding"),
        { ...screen("email", "onboarding"), channels: ["web"] },
        screen("goal", "onboarding"),
      ],
      assets: [],
    };
    const walked = (channel?: "app" | "web") => {
      const controller = createUiIrJourneyController({
        document: channelled,
        ...(channel ? { channel } : {}),
        onComplete: () => undefined,
        onDismiss: () => undefined,
      });
      controller.start();
      const ids = [controller.getState().activeScreenId];
      while (!controller.getState().isLast) {
        controller.next();
        ids.push(controller.getState().activeScreenId);
      }
      return ids;
    };

    assert.deepEqual(walked("app"), ["welcome", "quiz", "goal"]);
    assert.deepEqual(walked("web"), ["quiz", "email", "goal"]);
    assert.deepEqual(walked(), ["welcome", "quiz", "email", "goal"]);
  });
});

function standaloneFixture(): BuilderV2UiIrDocument {
  return {
    schemaVersion: 1,
    format: "onborn-ui-ir-v1",
    entryScreenId: "welcome",
    screens: [
      screen("welcome", "onboarding"),
      {
        ...screen("upsell", "paywall"),
        placement: "settings-upsell",
        standalone: true,
      },
      screen("goal", "onboarding"),
    ],
    assets: [],
  };
}

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
