import assert from "node:assert/strict";
import test from "node:test";

import { resolveBuilderV2PaywallPlacement } from "./paywall-placement";

const RESOLUTION = {
  schemaVersion: 1,
  placement: "settings-upsell",
  flowId: "flow-7",
  screenId: "upsell",
  releaseId: "a".repeat(64),
};

test("finds the flow that currently holds a named paywall", async () => {
  const requests: string[] = [];
  const resolved = await resolveBuilderV2PaywallPlacement({
    apiBaseUrl: "https://api.onborn.test",
    apiKey: "key",
    placement: "settings-upsell",
    fetchImpl: async (input) => {
      requests.push(String(input));
      return Response.json(RESOLUTION);
    },
  });

  assert.deepEqual(resolved, {
    flowId: "flow-7",
    screenId: "upsell",
    releaseId: "a".repeat(64),
  });
  assert.deepEqual(requests, [
    "https://api.onborn.test/runtime/v2/paywalls/settings-upsell/resolve",
  ]);
});

test("says plainly when nothing is published at that name", async () => {
  // The one failure an integrator causes and has to fix themselves, so it must
  // not read as a network problem worth retrying.
  await assert.rejects(
    resolveBuilderV2PaywallPlacement({
      apiBaseUrl: "https://api.onborn.test",
      apiKey: "key",
      placement: "winback",
      fetchImpl: async () =>
        new Response("not found", {
          status: 404,
        }),
    }),
    /No published paywall is registered at placement "winback"/,
  );
});

test("refuses a resolution it cannot read", async () => {
  await assert.rejects(
    resolveBuilderV2PaywallPlacement({
      apiBaseUrl: "https://api.onborn.test",
      apiKey: "key",
      placement: "winback",
      fetchImpl: async () => Response.json({ flowId: "flow-7" }),
    }),
    /unreadable resolution/,
  );
});
