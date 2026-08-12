import assert from "node:assert/strict";
import test from "node:test";

import type { BuilderV2UiIrArtifactManifest } from "./builder-v2-ui-ir-artifact";
import {
  BuilderV2UiIrHostManifestSchema,
  evaluateBuilderV2UiIrCompatibility,
} from "./builder-v2-ui-ir-runtime";

const artifact = {
  runtimeVersion: "onborn-runtime-1",
  requiredCapabilities: [
    { name: "analytics", minimumVersion: 1 },
    { name: "billing", minimumVersion: 2 },
  ],
} as BuilderV2UiIrArtifactManifest;

test("accepts a universal UI IR artifact without shared module declarations", () => {
  const host = BuilderV2UiIrHostManifestSchema.parse({
    schemaVersion: 1,
    runtimeVersion: "onborn-runtime-1",
    target: "ios",
    capabilities: [
      { name: "analytics", version: 1 },
      { name: "billing", version: 2 },
    ],
  });

  assert.deepEqual(evaluateBuilderV2UiIrCompatibility(artifact, "ios", host), {
    compatible: true,
    issues: [],
  });
});

test("reports target, runtime, and capability incompatibilities", () => {
  const host = BuilderV2UiIrHostManifestSchema.parse({
    schemaVersion: 1,
    runtimeVersion: "onborn-runtime-2",
    target: "android",
    capabilities: [{ name: "billing", version: 1 }],
  });

  assert.deepEqual(evaluateBuilderV2UiIrCompatibility(artifact, "ios", host), {
    compatible: false,
    issues: [
      { code: "target_mismatch", required: "ios", actual: "android" },
      {
        code: "runtime_version_mismatch",
        required: "onborn-runtime-1",
        actual: "onborn-runtime-2",
      },
      {
        code: "capability_missing",
        name: "analytics",
        minimumVersion: 1,
      },
      {
        code: "capability_version_too_low",
        name: "billing",
        minimumVersion: 2,
        actualVersion: 1,
      },
    ],
  });
});

test("rejects duplicate host capabilities", () => {
  const result = BuilderV2UiIrHostManifestSchema.safeParse({
    schemaVersion: 1,
    runtimeVersion: "onborn-runtime-1",
    target: "ios",
    capabilities: [
      { name: "analytics", version: 1 },
      { name: "analytics", version: 2 },
    ],
  });

  assert.equal(result.success, false);
});
