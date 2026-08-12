import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { UiIrJourneyController } from "../domain/ui-ir-journey";
import { UiIrRuntimeCapabilityUnavailableError } from "../ports/ui-ir-action-runtime";
import { createUiIrActionHandler } from "./create-ui-ir-action-handler";

describe("UI IR action handler", () => {
  it("dispatches navigation, billing, analytics, and native capabilities", async () => {
    const calls: string[] = [];
    const handler = createUiIrActionHandler({
      journey: journey(calls),
      analytics: {
        track: (event) => {
          calls.push(`analytics:${event.event}`);
        },
      },
      billing: {
        purchase: ({ packageId }) => {
          calls.push(`purchase:${packageId}`);
        },
        restore: () => {
          calls.push("restore");
        },
      },
      capabilities: {
        invoke: ({ capability, method }) => {
          calls.push(`capability:${capability}.${method}`);
        },
      },
    });

    await handler(context({ type: "navigation.next" }));
    await handler(
      context({
        type: "billing.purchase",
        source: { packageId: "yearly" },
      }),
    );
    await handler(
      context({
        type: "capability.invoke",
        capability: "camera",
        method: "capture",
      }),
    );

    assert.deepEqual(calls, [
      "analytics:ui_interaction",
      "next",
      "analytics:ui_interaction",
      "purchase:yearly",
      "analytics:ui_interaction",
      "capability:camera.capture",
    ]);
  });

  it("fails explicitly when billing is not installed", async () => {
    const handler = createUiIrActionHandler({ journey: journey([]) });
    await assert.rejects(
      handler(context({ type: "billing.restore" })),
      UiIrRuntimeCapabilityUnavailableError,
    );
  });
});

function context(
  action: Parameters<ReturnType<typeof createUiIrActionHandler>>[0]["action"],
) {
  return {
    screenId: "welcome",
    nodeId: "cta",
    action,
    // Supplied by the pressable in the real renderer, which is the only place
    // that knows both the loaded offering and the screen's selection.
    resolvePurchaseTarget: (
      source: Extract<typeof action, { type: "billing.purchase" }>["source"],
    ) => ("packageId" in source ? source.packageId : undefined),
  };
}

function journey(calls: string[]): UiIrJourneyController {
  return {
    getState: () => ({
      activeScreenId: "welcome",
      position: 0,
      total: 1,
      surface: "onboarding",
      isFirst: true,
      isLast: true,
    }),
    subscribe: () => () => undefined,
    start: () => undefined,
    next: () => calls.push("next"),
    back: () => calls.push("back"),
    complete: () => calls.push("complete"),
    dismiss: () => calls.push("dismiss"),
    openPlacement: (placement) => calls.push(`paywall:${placement}`),
  };
}
