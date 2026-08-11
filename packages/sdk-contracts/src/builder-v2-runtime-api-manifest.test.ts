import assert from "node:assert/strict";
import test from "node:test";
import { BUILDER_V2_RUNTIME_API_MANIFEST } from "./builder-v2-runtime-api-manifest";

test("runtime API manifest documents every supported capability group", () => {
  assert.deepEqual(Object.keys(BUILDER_V2_RUNTIME_API_MANIFEST.groups), [
    "navigation",
    "interactions",
    "localization",
    "billing",
    "camera",
    "haptics",
    "notifications",
    "storeReview",
  ]);
  assert.deepEqual(
    Object.keys(BUILDER_V2_RUNTIME_API_MANIFEST.groups.navigation.methods),
    ["continue", "back", "complete", "dismiss"],
  );
  assert.match(
    BUILDER_V2_RUNTIME_API_MANIFEST.groups.billing.methods.purchase.signature,
    /runtime\.billing\?\.purchase/,
  );
});
