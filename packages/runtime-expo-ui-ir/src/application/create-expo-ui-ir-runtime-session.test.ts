import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import type { CachedUiIrArtifact } from "@onborn/runtime-ui-ir/artifact";
import type { BuilderV2UiIrHostManifest } from "@onborn/sdk-contracts";

import { InMemoryUiIrArtifactCache } from "../testing/in-memory-ui-ir-artifact-cache";
import { createExpoUiIrRuntimeSession } from "./create-expo-ui-ir-runtime-session";

const HOST: BuilderV2UiIrHostManifest = {
  schemaVersion: 1,
  runtimeVersion: "onborn-runtime-1",
  target: "ios",
  capabilities: [
    { name: "navigation", version: 1 },
    { name: "safe-area", version: 1 },
  ],
};

describe("createExpoUiIrRuntimeSession", () => {
  it("boots an offline journey from the last-known-good artifact", async () => {
    const fixture = createCachedFixture();
    const cache = new InMemoryUiIrArtifactCache();
    const events: string[] = [];
    cache.seed({ flowId: "flow-1", environment: "test" }, fixture.cached);
    cache.seedFile(fixture.documentUri, fixture.documentBytes);

    const session = await createExpoUiIrRuntimeSession(
      {
        flowId: "flow-1",
        environment: "test",
        host: HOST,
      },
      {
        cache,
        crypto: {
          sha256,
          async verifyEd25519() {
            return true;
          },
        },
        delivery: {
          async fetchArtifact() {
            throw new Error("Offline");
          },
          async downloadFile() {
            throw new Error("Offline");
          },
        },
        analytics: {
          track(event) {
            events.push(event.event);
          },
        },
        onComplete() {},
        onDismiss() {},
      },
    );

    assert.equal(session.source, "last-known-good");
    assert.equal(session.failureCode, "cache_activation_failed");
    assert.equal(session.document.entryScreenId, "welcome");
    session.controller.start();
    session.controller.next();
    assert.deepEqual(events, [
      "journey.started",
      "screen.viewed",
      "screen.completed",
      "screen.viewed",
      "paywall.viewed",
    ]);
  });

  it("rejects a web host before artifact delivery", async () => {
    let deliveryCalled = false;

    await assert.rejects(
      createExpoUiIrRuntimeSession(
        {
          flowId: "flow-1",
          environment: "test",
          host: { ...HOST, target: "web" },
        },
        {
          cache: new InMemoryUiIrArtifactCache(),
          crypto: {
            sha256,
            async verifyEd25519() {
              return true;
            },
          },
          delivery: {
            async fetchArtifact() {
              deliveryCalled = true;
              return null;
            },
            async downloadFile() {
              return new Uint8Array();
            },
          },
          onComplete() {},
          onDismiss() {},
        },
      ),
      /requires an iOS or Android host/,
    );
    assert.equal(deliveryCalled, false);
  });

  it("creates analytics only after loading the verified document context", async () => {
    const fixture = createCachedFixture();
    const cache = new InMemoryUiIrArtifactCache();
    const contexts: Array<{
      artifactId: string;
      releaseId: string;
      source: string;
      entryScreenId: string;
    }> = [];
    const events: string[] = [];
    cache.seed({ flowId: "flow-1", environment: "test" }, fixture.cached);
    cache.seedFile(fixture.documentUri, fixture.documentBytes);

    const session = await createExpoUiIrRuntimeSession(
      {
        flowId: "flow-1",
        environment: "test",
        host: HOST,
      },
      {
        cache,
        crypto: {
          sha256,
          async verifyEd25519() {
            return true;
          },
        },
        delivery: {
          async fetchArtifact() {
            throw new Error("Offline");
          },
          async downloadFile() {
            throw new Error("Offline");
          },
        },
        createAnalytics(context) {
          contexts.push({
            artifactId: context.artifact.artifact.manifest.artifactId,
            releaseId: context.artifact.release.releaseId,
            source: context.source,
            entryScreenId: context.document.entryScreenId,
          });
          return {
            track(event) {
              events.push(event.event);
            },
          };
        },
        onComplete() {},
        onDismiss() {},
      },
    );

    session.controller.start();
    assert.deepEqual(contexts, [
      {
        artifactId: "c".repeat(64),
        releaseId: "d".repeat(64),
        source: "last-known-good",
        entryScreenId: "welcome",
      },
    ]);
    assert.deepEqual(events, ["journey.started", "screen.viewed"]);
  });

  it("pins the loaded artifact until a new runtime session starts", async () => {
    const first = createCachedFixture({
      artifactCharacter: "c",
      entryScreenId: "welcome",
      releaseCharacter: "d",
    });
    const second = createCachedFixture({
      artifactCharacter: "e",
      entryScreenId: "updated-welcome",
      releaseCharacter: "f",
    });
    const cache = new InMemoryUiIrArtifactCache();
    cache.seed({ flowId: "flow-1", environment: "test" }, first.cached);
    cache.seedFile(first.documentUri, first.documentBytes);

    const mountedSession = await createExpoUiIrRuntimeSession(
      {
        flowId: "flow-1",
        environment: "test",
        host: HOST,
      },
      createOfflineDependencies(cache),
    );

    cache.seed({ flowId: "flow-1", environment: "test" }, second.cached);
    cache.seedFile(second.documentUri, second.documentBytes);

    const nextSession = await createExpoUiIrRuntimeSession(
      {
        flowId: "flow-1",
        environment: "test",
        host: HOST,
      },
      createOfflineDependencies(cache),
    );

    assert.equal(
      mountedSession.artifact.release.releaseId,
      first.cached.release.releaseId,
    );
    assert.equal(mountedSession.document.entryScreenId, "welcome");
    assert.equal(
      nextSession.artifact.release.releaseId,
      second.cached.release.releaseId,
    );
    assert.equal(nextSession.document.entryScreenId, "updated-welcome");
  });

  it("rejects ambiguous analytics configuration", async () => {
    await assert.rejects(
      createExpoUiIrRuntimeSession(
        {
          flowId: "flow-1",
          environment: "test",
          host: HOST,
        },
        {
          cache: new InMemoryUiIrArtifactCache(),
          crypto: {
            sha256,
            async verifyEd25519() {
              return true;
            },
          },
          delivery: {
            async fetchArtifact() {
              return null;
            },
            async downloadFile() {
              return new Uint8Array();
            },
          },
          analytics: { track() {} },
          createAnalytics: () => ({ track() {} }),
          onComplete() {},
          onDismiss() {},
        },
      ),
      /either analytics or createAnalytics/,
    );
  });
});

function createCachedFixture(
  options: {
    artifactCharacter?: string;
    entryScreenId?: string;
    releaseCharacter?: string;
  } = {},
): {
  cached: CachedUiIrArtifact;
  documentBytes: Uint8Array;
  documentUri: string;
} {
  const artifactCharacter = options.artifactCharacter ?? "c";
  const entryScreenId = options.entryScreenId ?? "welcome";
  const releaseCharacter = options.releaseCharacter ?? "d";
  const documentBytes = new TextEncoder().encode(
    JSON.stringify({
      schemaVersion: 1,
      format: "onborn-ui-ir-v1",
      entryScreenId,
      screens: [
        {
          screenId: entryScreenId,
          surface: "onboarding",
          root: {
            id: `${entryScreenId}.root`,
            type: "safe-area-view",
            children: [],
          },
        },
        {
          screenId: "paywall",
          surface: "paywall",
          placement: "onboarding-end",
          root: {
            id: "paywall.root",
            type: "safe-area-view",
            children: [],
          },
        },
      ],
      assets: [],
    }),
  );
  const artifactId = artifactCharacter.repeat(64);
  const documentUri = `memory://${artifactId}/ui-ir/document.json`;
  const source = {
    revisionId: "22222222-2222-4222-8222-222222222222",
    sequence: 1,
    sourceHash: "a".repeat(64),
    specificationLineage: null,
  };
  const file = {
    path: "ui-ir/document.json",
    role: "document" as const,
    contentHash: sha256(documentBytes),
    byteLength: documentBytes.byteLength,
  };
  return {
    documentBytes,
    documentUri,
    cached: {
      release: {
        schemaVersion: 1,
        releaseId: releaseCharacter.repeat(64),
        flowId: "flow-1",
        environment: "test",
        source,
        runtimeVersion: "onborn-runtime-1",
        artifactId,
        createdAt: "2026-07-30T08:00:00.000Z",
        activatedAt: "2026-07-30T08:05:00.000Z",
      },
      artifact: {
        manifest: {
          schemaVersion: 1,
          artifactId,
          runtimeVersion: "onborn-runtime-1",
          format: "onborn-ui-ir-v1",
          target: "universal",
          source,
          entry: { documentFile: file.path },
          files: [file],
          requiredCapabilities: [
            { name: "navigation", minimumVersion: 1 },
            { name: "safe-area", minimumVersion: 1 },
          ],
        },
        signature: {
          schemaVersion: 1,
          algorithm: "ed25519",
          keyId: "test",
          manifestHash: "e".repeat(64),
          value: "signature",
        },
      },
      files: [{ ...file, uri: documentUri }],
      activatedAt: "2026-07-30T08:05:00.000Z",
    },
  };
}

function createOfflineDependencies(cache: InMemoryUiIrArtifactCache) {
  return {
    cache,
    crypto: {
      sha256,
      async verifyEd25519() {
        return true;
      },
    },
    delivery: {
      async fetchArtifact() {
        throw new Error("Offline");
      },
      async downloadFile() {
        throw new Error("Offline");
      },
    },
    onComplete() {},
    onDismiss() {},
  };
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}
