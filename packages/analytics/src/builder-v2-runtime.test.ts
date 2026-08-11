import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BuilderV2RuntimeEvent } from "@onborn/sdk-contracts/builder-v2-runtime-events";
import { Onborn } from "./client";
import { MemoryAnalyticsStorage } from "./storage";

describe("Builder V2 runtime analytics transport", () => {
  it("maps runtime lifecycle events into the durable analytics batch", async () => {
    const requests: unknown[] = [];
    const storage = new MemoryAnalyticsStorage();
    Onborn.init({
      apiKey: "sdk_test",
      userId: "user-runtime",
      appId: "app-runtime",
      appVersion: "1.2.3",
      platform: "ios",
      analyticsStorage: storage,
      fetchImpl: (async (_input, init) => {
        requests.push(JSON.parse(String(init?.body)) as unknown);
        return new Response(
          JSON.stringify({ received: 4, failed: 0 }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }) as typeof fetch,
    });

    await Onborn.emitRuntimeEvent(runtimeEvent("flow_started", 0));
    await Onborn.emitRuntimeEvent(
      runtimeEvent("screen_viewed", 1_000, {
        screenId: "screen:welcome",
      }),
    );
    await Onborn.emitRuntimeEvent(
      runtimeEvent("screen_completed", 3_500, {
        screenId: "screen:welcome",
      }),
    );
    await Onborn.emitRuntimeEvent(runtimeEvent("flow_completed", 5_000));

    assert.equal(await Onborn.getQueueSize(), 4);
    assert.deepEqual(await Onborn.flush(), {
      attempted: 4,
      sent: 4,
      failed: 0,
      remaining: 0,
    });

    const batch = requests[0] as {
      events: Array<Record<string, unknown>>;
    };
    assert.deepEqual(
      batch.events.map((event) => event.type),
      ["flow_started", "step_viewed", "step_completed", "flow_completed"],
    );
    assert.deepEqual(
      batch.events.map((event) => event.timestamp),
      [0, 1_000, 3_500, 5_000],
    );
    assert.equal(batch.events[2]?.timeSpentMs, 2_500);
    assert.equal(batch.events[3]?.totalTimeMs, 5_000);
    assert.equal(batch.events[3]?.stepsCompleted, 1);
    assert.equal(batch.events[1]?.flowName, "Runtime flow");
    assert.equal(batch.events[1]?.runtimeSource, "builder_v2");
    assert.equal(batch.events[1]?.runtimeVersion, "onborn-runtime-1");
    assert.equal(batch.events[1]?.artifactId, "a".repeat(64));
    assert.equal(batch.events[1]?.releaseId, "b".repeat(64));
    assert.equal(batch.events[1]?.experimentId, "experiment-runtime");
    assert.equal(batch.events[1]?.experimentVariantId, "variant-b");
    assert.equal(
      batch.events[1]?.experimentAssignmentId,
      "assignment-runtime",
    );
  });

  it("maps paywall restore results without requiring a second transport", async () => {
    const requests: unknown[] = [];
    Onborn.init({
      apiKey: "sdk_test",
      userId: "user-runtime",
      appId: "app-runtime",
      appVersion: "1.2.3",
      platform: "ios",
      fetchImpl: (async (_input, init) => {
        requests.push(JSON.parse(String(init?.body)) as unknown);
        return new Response(
          JSON.stringify({ received: 2, failed: 0 }),
          { status: 200 },
        );
      }) as typeof fetch,
    });

    await Onborn.emitRuntimeEvent(
      runtimeEvent("restore_started", 10, {
        screenId: "screen:paywall",
      }),
    );
    await Onborn.emitRuntimeEvent(
      runtimeEvent("restore_empty", 20, {
        screenId: "screen:paywall",
      }),
    );
    await Onborn.flush();

    const batch = requests[0] as {
      events: Array<Record<string, unknown>>;
    };
    assert.deepEqual(
      batch.events.map((event) => event.type),
      ["paywall_restore_started", "paywall_restore_completed"],
    );
    assert.equal(batch.events[1]?.restored, false);
    assert.equal(batch.events[1]?.paywallId, "screen:paywall");
  });

  it("maps a host-owned experiment exposure as a dedicated event", async () => {
    const requests: unknown[] = [];
    Onborn.init({
      apiKey: "sdk_test",
      userId: "user-runtime",
      appId: "app-runtime",
      appVersion: "1.2.3",
      platform: "ios",
      fetchImpl: (async (_input, init) => {
        requests.push(JSON.parse(String(init?.body)) as unknown);
        return new Response(
          JSON.stringify({ received: 1, failed: 0 }),
          { status: 200 },
        );
      }) as typeof fetch,
    });

    await Onborn.emitRuntimeEvent(
      runtimeEvent("experiment_exposed", 10),
    );
    await Onborn.flush();

    const batch = requests[0] as {
      events: Array<Record<string, unknown>>;
    };
    assert.deepEqual(batch.events[0], {
      eventId: batch.events[0]?.eventId,
      flowId: "flow-runtime",
      flowName: "Runtime flow",
      sessionId: "session-runtime",
      userId: "user-runtime",
      appId: "app-runtime",
      timestamp: 10,
      platform: "ios",
      appVersion: "1.2.3",
      sdkVersion: batch.events[0]?.sdkVersion,
      type: "experiment_exposed",
      experimentId: "experiment-runtime",
      experimentVariantId: "variant-b",
      experimentAssignmentId: "assignment-runtime",
      runtimeSource: "builder_v2",
      runtimeVersion: "onborn-runtime-1",
      runtimeTarget: "ios",
      artifactId: "a".repeat(64),
      releaseId: "b".repeat(64),
    });
  });
});

function runtimeEvent(
  type: BuilderV2RuntimeEvent["action"]["type"],
  timestamp: number,
  fields: Record<string, unknown> = {},
): BuilderV2RuntimeEvent {
  const screenContext =
    "screenId" in fields
      ? {
          position: fields.screenId === "screen:paywall" ? 1 : 0,
          surface:
            fields.screenId === "screen:paywall"
              ? ("paywall" as const)
              : ("onboarding" as const),
        }
      : undefined;
  return {
    schemaVersion: 1,
    action: {
      type,
      ...fields,
    } as BuilderV2RuntimeEvent["action"],
    flowId: "flow-runtime",
    flowName: "Runtime flow",
    sessionId: "session-runtime",
    environment: "test",
    target: "ios",
    runtimeVersion: "onborn-runtime-1",
    artifactId: "a".repeat(64),
    releaseId: "b".repeat(64),
    experiment: {
      id: "experiment-runtime",
      variantId: "variant-b",
      variantName: "Variant B",
      assignmentId: "assignment-runtime",
    },
    occurredAt: new Date(timestamp).toISOString(),
    ...(screenContext ? { screenContext } : {}),
  } as BuilderV2RuntimeEvent;
}
