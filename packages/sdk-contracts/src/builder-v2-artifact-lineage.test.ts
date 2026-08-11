import assert from "node:assert/strict";
import test from "node:test";

import {
  BuilderV2ArtifactSignatureSchema,
  BuilderV2ArtifactSourceSchema,
} from "./builder-v2-artifact-lineage";

const HASH = "a".repeat(64);

test("artifact lineage accepts an immutable source revision and specification hashes", () => {
  const result = BuilderV2ArtifactSourceSchema.parse({
    revisionId: "11111111-1111-4111-8111-111111111111",
    sequence: 4,
    sourceHash: HASH,
    specificationLineage: {
      planHash: "b".repeat(64),
      designHash: "c".repeat(64),
    },
  });

  assert.equal(result.sequence, 4);
  assert.equal(result.specificationLineage?.planHash, "b".repeat(64));
});

test("artifact signature rejects executable or malformed signature payloads", () => {
  const result = BuilderV2ArtifactSignatureSchema.safeParse({
    schemaVersion: 1,
    algorithm: "ed25519",
    keyId: "test-key",
    manifestHash: HASH,
    value: "not valid base64url",
    executable: "remote.js",
  });

  assert.equal(result.success, false);
});
