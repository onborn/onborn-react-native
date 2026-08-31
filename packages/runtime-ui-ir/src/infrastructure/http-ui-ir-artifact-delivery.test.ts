import assert from "node:assert/strict";
import { test } from "node:test";

import { HttpUiIrArtifactDelivery } from "./http-ui-ir-artifact-delivery";

function recordingFetch(): {
  urls: string[];
  fetchImpl: typeof fetch;
} {
  const urls: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL) => {
    urls.push(String(input));
    return new Response(JSON.stringify({ schemaVersion: 1 }), { status: 200 });
  }) as typeof fetch;
  return { urls, fetchImpl };
}

test("carries the caller identity so an experiment can split traffic", async () => {
  const { urls, fetchImpl } = recordingFetch();
  const delivery = new HttpUiIrArtifactDelivery({
    apiBaseUrl: "https://api.example.com",
    apiKey: "cf_test_key",
    fetchImpl,
    userId: "user-1",
    sessionId: "session-1",
  });

  await delivery.fetchArtifact({ flowId: "flow-1", target: "ios" });

  const url = new URL(urls[0] ?? "");
  assert.equal(url.pathname, "/runtime/v2/flows/flow-1/artifact");
  assert.equal(url.searchParams.get("target"), "ios");
  assert.equal(url.searchParams.get("userId"), "user-1");
  assert.equal(url.searchParams.get("sessionId"), "session-1");
});

test("omits identity parameters that were not supplied", async () => {
  const { urls, fetchImpl } = recordingFetch();
  const delivery = new HttpUiIrArtifactDelivery({
    apiBaseUrl: "https://api.example.com",
    apiKey: "cf_test_key",
    fetchImpl,
  });

  await delivery.fetchArtifact({ flowId: "flow-1", target: "android" });

  const url = new URL(urls[0] ?? "");
  assert.equal(url.searchParams.has("userId"), false);
  assert.equal(url.searchParams.has("sessionId"), false);
});
