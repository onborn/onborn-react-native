import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  BuilderV2UiIrArtifactDeliverySchema,
  type BuilderV2UiIrArtifactDelivery,
} from "@onborn/sdk-contracts/builder-v2-ui-ir-artifact";
import type { BuilderV2UiIrHostManifest } from "@onborn/sdk-contracts/builder-v2-ui-ir-runtime";

import { canonicalJson } from "../domain/canonical-json";
import { UiIrArtifactError } from "../domain/ui-ir-artifact-errors";
import type { UiIrArtifactCryptoPort } from "../ports/ui-ir-artifact-crypto";
import type { UiIrArtifactDeliveryPort } from "../ports/ui-ir-artifact-delivery";
import type { UiIrRuntimeDiagnosticsPort } from "../ports/ui-ir-runtime-diagnostics";
import { InMemoryUiIrArtifactCache } from "../testing/in-memory-ui-ir-artifact-cache";
import { loadCachedUiIrDocument } from "./load-cached-ui-ir-document";
import { loadUiIrArtifactSession } from "./load-ui-ir-artifact-session";
import { refreshUiIrArtifact } from "./refresh-ui-ir-artifact";

const host: BuilderV2UiIrHostManifest = {
  schemaVersion: 1,
  runtimeVersion: "onborn-runtime-1",
  target: "ios",
  capabilities: [
    { name: "navigation", version: 1 },
    { name: "safe-area", version: 1 },
  ],
};
const testClock = {
  now: () => Date.parse("2026-07-30T10:00:00.000Z"),
};

describe("refreshUiIrArtifact", () => {
  it("verifies, stages, activates, and loads a valid document", async () => {
    const fixture = createDelivery();
    const cache = new InMemoryUiIrArtifactCache();
    const crypto = testCrypto(true);

    const result = await refreshUiIrArtifact(
      { flowId: "flow-1", environment: "test", host },
      {
        cache,
        crypto,
        delivery: deliveryPort(fixture.delivery, fixture.documentBytes),
        clock: testClock,
      },
    );

    assert.equal(result.source, "network");
    assert.equal(result.artifact.release.releaseId, "b".repeat(64));
    assert.equal(cache.stageCount(), 0);
    const document = await loadCachedUiIrDocument(result.artifact, {
      cache,
      crypto,
    });
    assert.equal(document.entryScreenId, "welcome");
    assert.equal(document.screens[0]?.root.type, "safe-area-view");
  });

  it("preserves last-known-good when a downloaded file is corrupted", async () => {
    const fixture = createDelivery();
    const cache = new InMemoryUiIrArtifactCache();
    const crypto = testCrypto(true);
    const first = await refreshUiIrArtifact(
      { flowId: "flow-1", environment: "test", host },
      {
        cache,
        crypto,
        delivery: deliveryPort(fixture.delivery, fixture.documentBytes),
        clock: testClock,
      },
    );

    const result = await refreshUiIrArtifact(
      { flowId: "flow-1", environment: "test", host },
      {
        cache,
        crypto,
        delivery: deliveryPort(
          fixture.delivery,
          new TextEncoder().encode('{"corrupted":true}'),
        ),
        clock: testClock,
      },
    );

    assert.equal(result.source, "last-known-good");
    assert.equal(result.failureCode, "file_integrity_failed");
    assert.equal(
      result.artifact.artifact.manifest.artifactId,
      first.artifact.artifact.manifest.artifactId,
    );
    assert.equal(cache.stageCount(), 0);
  });

  it("rejects an invalid signature when no trusted artifact is cached", async () => {
    const fixture = createDelivery();

    await assert.rejects(
      refreshUiIrArtifact(
        { flowId: "flow-1", environment: "test", host },
        {
          cache: new InMemoryUiIrArtifactCache(),
          crypto: testCrypto(false),
          delivery: deliveryPort(fixture.delivery, fixture.documentBytes),
          clock: testClock,
        },
      ),
      (error: unknown) =>
        error instanceof UiIrArtifactError &&
        error.code === "signature_invalid",
    );
  });
});

describe("loadUiIrArtifactSession", () => {
  it("blocks UI IR when the backend explicitly disables the runtime", async () => {
    const fixture = createDelivery();
    const diagnostics = diagnosticRecorder();

    await assert.rejects(
      loadUiIrArtifactSession(
        { flowId: "flow-1", environment: "test", host },
        {
          cache: new InMemoryUiIrArtifactCache(),
          control: {
            async resolve() {
              return {
                schemaVersion: 1,
                enabled: false,
                reason: "environment_disabled",
                checkedAt: "2026-07-30T10:00:00.000Z",
                recheckAfterSeconds: 60,
              };
            },
          },
          crypto: testCrypto(true),
          delivery: deliveryPort(fixture.delivery, fixture.documentBytes),
          diagnostics,
          clock: testClock,
        },
      ),
      (error: unknown) =>
        error instanceof UiIrArtifactError &&
        error.code === "runtime_disabled",
    );

    assert.deepEqual(
      diagnostics.events.map((event) => event.event),
      ["runtime_blocked"],
    );
  });

  it("keeps verified delivery available when only the control check fails", async () => {
    const fixture = createDelivery();
    const diagnostics = diagnosticRecorder();

    const result = await loadUiIrArtifactSession(
      { flowId: "flow-1", environment: "test", host },
      {
        cache: new InMemoryUiIrArtifactCache(),
        control: {
          async resolve() {
            throw new Error("control offline");
          },
        },
        crypto: testCrypto(true),
        delivery: deliveryPort(fixture.delivery, fixture.documentBytes),
        diagnostics,
        clock: testClock,
      },
    );

    assert.equal(result.source, "network");
    assert.deepEqual(
      diagnostics.events.map((event) => event.event),
      ["control_check_failed", "load_succeeded"],
    );
  });
});

function createDelivery(): {
  delivery: BuilderV2UiIrArtifactDelivery;
  documentBytes: Uint8Array;
} {
  const documentBytes = new TextEncoder().encode(
    JSON.stringify({
      schemaVersion: 1,
      format: "onborn-ui-ir-v1",
      entryScreenId: "welcome",
      screens: [
        {
          screenId: "welcome",
          surface: "onboarding",
          root: {
            id: "welcome.root",
            type: "safe-area-view",
            children: [
              {
                id: "welcome.title",
                type: "text",
                text: { kind: "literal", value: "Welcome" },
              },
            ],
          },
        },
      ],
      assets: [],
    }),
  );
  const file = {
    path: "ui-ir/document.json",
    role: "document" as const,
    contentHash: sha256(documentBytes),
    byteLength: documentBytes.byteLength,
  };
  const source = {
    revisionId: "22222222-2222-4222-8222-222222222222",
    sequence: 1,
    sourceHash: "a".repeat(64),
    specificationLineage: null,
  };
  const identity = {
    schemaVersion: 1 as const,
    runtimeVersion: "onborn-runtime-1" as const,
    format: "onborn-ui-ir-v1" as const,
    target: "universal" as const,
    source,
    entry: { documentFile: file.path },
    files: [file],
    requiredCapabilities: [
      { name: "navigation" as const, minimumVersion: 1 },
      { name: "safe-area" as const, minimumVersion: 1 },
    ],
  };
  const manifest = {
    ...identity,
    artifactId: sha256(canonicalJson(identity)),
  };
  const manifestHash = sha256(canonicalJson(manifest));
  const delivery = BuilderV2UiIrArtifactDeliverySchema.parse({
    schemaVersion: 1,
    release: {
      schemaVersion: 1,
      releaseId: "b".repeat(64),
      flowId: "flow-1",
      environment: "test",
      source,
      runtimeVersion: manifest.runtimeVersion,
      artifactId: manifest.artifactId,
      createdAt: "2026-07-30T09:00:00.000Z",
      activatedAt: "2026-07-30T09:05:00.000Z",
    },
    requestedTarget: "ios",
    artifact: {
      manifest,
      signature: {
        schemaVersion: 1,
        algorithm: "ed25519",
        keyId: "test-key",
        manifestHash,
        value: "valid_signature",
      },
    },
    files: [{ ...file, url: "https://artifacts.test/document.json" }],
    expiresAt: "2026-07-30T11:00:00.000Z",
  });
  return { delivery, documentBytes };
}

function deliveryPort(
  delivery: BuilderV2UiIrArtifactDelivery,
  bytes: Uint8Array,
): UiIrArtifactDeliveryPort {
  return {
    async fetchArtifact() {
      return delivery;
    },
    async downloadFile() {
      return bytes.slice();
    },
  };
}

function testCrypto(signatureValid: boolean): UiIrArtifactCryptoPort {
  return {
    sha256,
    async verifyEd25519() {
      return signatureValid;
    },
  };
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function diagnosticRecorder(): UiIrRuntimeDiagnosticsPort & {
  events: Parameters<UiIrRuntimeDiagnosticsPort["report"]>[0][];
} {
  const events: Parameters<UiIrRuntimeDiagnosticsPort["report"]>[0][] = [];
  return {
    events,
    report(event) {
      events.push(event);
    },
  };
}
