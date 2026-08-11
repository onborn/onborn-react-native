import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createExpoUiIrActionPorts } from "./create-expo-ui-ir-action-ports";

describe("createExpoUiIrActionPorts", () => {
  it("bridges completed purchases and emits lifecycle analytics", async () => {
    const events: string[] = [];
    const purchases: string[] = [];
    const ports = createExpoUiIrActionPorts({
      analytics: {
        track(event) {
          events.push(event.event);
        },
      },
      billing: {
        async purchase(input) {
          purchases.push(input.packageId);
          return { status: "completed", productId: "product.yearly" };
        },
        async restore() {
          return { status: "empty" };
        },
      },
    });

    await ports.billing?.purchase({
      packageId: "yearly",
      screenId: "paywall",
      nodeId: "paywall.purchase",
    });

    assert.deepEqual(purchases, ["yearly"]);
    assert.deepEqual(events, ["purchase_started", "purchase_completed"]);
  });

  it("reports failed restores and preserves the provider failure", async () => {
    const events: string[] = [];
    const failure = new Error("Store unavailable");
    const ports = createExpoUiIrActionPorts({
      analytics: {
        track(event) {
          events.push(event.event);
        },
      },
      billing: {
        async purchase() {
          return { status: "cancelled" };
        },
        async restore() {
          throw failure;
        },
      },
    });

    assert.ok(ports.billing);
    await assert.rejects(
      async () => {
        await ports.billing!.restore({
          screenId: "paywall",
          nodeId: "paywall.restore",
        });
      },
      failure,
    );
    assert.deepEqual(events, ["restore_started", "restore_failed"]);
  });

  it("forwards native capability invocations without coercing input", async () => {
    const invocations: unknown[] = [];
    const ports = createExpoUiIrActionPorts({
      capabilities: {
        invoke(input) {
          invocations.push(input);
        },
        render() {
          return null;
        },
      },
    });

    await ports.capabilities?.invoke({
      capability: "haptics",
      method: "impact",
      input: { style: "medium" },
      screenId: "welcome",
      nodeId: "welcome.cta",
    });

    assert.deepEqual(invocations, [
      {
        capability: "haptics",
        method: "impact",
        input: { style: "medium" },
        screenId: "welcome",
        nodeId: "welcome.cta",
      },
    ]);
  });
});
