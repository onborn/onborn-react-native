import assert from "node:assert/strict";
import test from "node:test";
import { BUILDER_V2_RUNTIME_API_MANIFEST } from "./builder-v2-runtime-api-manifest";

test("runtime API manifest documents every supported capability group", () => {
  assert.deepEqual(Object.keys(BUILDER_V2_RUNTIME_API_MANIFEST.groups), [
    "navigation",
    "interactions",
    "localization",
    "billing",
    "links",
    "auth",
    "camera",
    "haptics",
    "notifications",
    "storeReview",
  ]);
  assert.deepEqual(
    Object.keys(BUILDER_V2_RUNTIME_API_MANIFEST.groups.navigation.methods),
    ["continue", "back", "complete", "dismiss"],
  );
  /*
   * Not the optional-chained device signature this used to assert. Billing is
   * always there on the authoring side, and it is bought by plan — the optional
   * form pushed screens into `billing?.hasPlan(0)`, which the artifact compiler
   * rejects.
   */
  assert.equal(BUILDER_V2_RUNTIME_API_MANIFEST.groups.billing.required, true);
  assert.match(
    BUILDER_V2_RUNTIME_API_MANIFEST.groups.billing.methods.purchase.signature,
    /runtime\.billing\.purchase\(plan\)/,
  );
});
