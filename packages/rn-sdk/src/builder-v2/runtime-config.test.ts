import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveBuilderV2Environment,
  resolveBuilderV2Target,
} from "./runtime-environment";
import { createBuilderV2HostManifest } from "./runtime-manifest";

test("derives the runtime environment from the initialized API key", () => {
  assert.equal(resolveBuilderV2Environment("cf_test_example"), "test");
  assert.equal(resolveBuilderV2Environment("cf_live_example"), "prod");
  assert.throws(
    () => resolveBuilderV2Environment("invalid"),
    /supported environment prefix/,
  );
});

test("accepts only native Builder V2 artifact targets", () => {
  assert.equal(resolveBuilderV2Target("ios"), "ios");
  assert.equal(resolveBuilderV2Target("android"), "android");
  assert.throws(() => resolveBuilderV2Target("web"), /iOS or Android host/);
});

test("advertises only capabilities implemented by the public host runtime", () => {
  const manifest = createBuilderV2HostManifest("ios");

  assert.deepEqual(
    manifest.capabilities.map(({ name }) => name),
    [
      "analytics",
      "assets",
      "billing",
      "google-fonts",
      "image",
      "localization",
      "navigation",
      "safe-area",
    ],
  );
  assert.equal(manifest.runtimeVersion, "onborn-runtime-1");
  assert.equal(manifest.target, "ios");
});
