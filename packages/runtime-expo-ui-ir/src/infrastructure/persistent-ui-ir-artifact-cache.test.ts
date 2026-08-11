import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  BuilderV2UiIrRelease,
  BuilderV2SignedUiIrArtifact,
} from "@onborn/sdk-contracts/builder-v2-ui-ir-artifact";

import type { PersistentUiIrStoragePort } from "../ports/persistent-ui-ir-storage";
import { PersistentUiIrArtifactCache } from "./persistent-ui-ir-artifact-cache";

const DOCUMENT_BYTES = new TextEncoder().encode('{"schemaVersion":1}');
const FILE = {
  path: "ui-ir/document.json",
  role: "document" as const,
  contentHash: "c".repeat(64),
  byteLength: DOCUMENT_BYTES.byteLength,
};

describe("PersistentUiIrArtifactCache", () => {
  it("activates a complete stage and survives cache reconstruction", async () => {
    const storage = new MemoryStorage();
    const createId = sequentialIds();
    const cache = new PersistentUiIrArtifactCache({
      storage,
      createId,
      now: () => Date.parse("2026-07-30T12:00:00.000Z"),
    });
    const stageId = await cache.createStage(fixture());
    await cache.writeStageFile({
      stageId,
      file: FILE,
      bytes: DOCUMENT_BYTES,
    });
    const activated = await cache.activateStage(stageId);

    const reconstructed = new PersistentUiIrArtifactCache({
      storage,
      createId,
    });
    const active = await reconstructed.readActive({
      flowId: "flow-1",
      environment: "test",
    });

    assert.equal(active?.release.releaseId, activated.release.releaseId);
    assert.deepEqual(
      await reconstructed.readFile(active!.files[0]!.uri),
      DOCUMENT_BYTES,
    );
  });

  it("rejects activation when a signed file was not staged", async () => {
    const cache = new PersistentUiIrArtifactCache({
      storage: new MemoryStorage(),
      createId: sequentialIds(),
    });
    const stageId = await cache.createStage(fixture());

    await assert.rejects(
      cache.activateStage(stageId),
      /artifact stage is incomplete/,
    );
  });
});

function fixture(): {
  scope: { flowId: string; environment: "test" };
  release: BuilderV2UiIrRelease;
  artifact: BuilderV2SignedUiIrArtifact;
} {
  const source = {
    revisionId: "22222222-2222-4222-8222-222222222222",
    sequence: 1,
    sourceHash: "a".repeat(64),
    specificationLineage: null,
  };
  const artifactId = "d".repeat(64);
  return {
    scope: { flowId: "flow-1", environment: "test" },
    release: {
      schemaVersion: 1,
      releaseId: "e".repeat(64),
      flowId: "flow-1",
      environment: "test",
      source,
      runtimeVersion: "onborn-runtime-1",
      artifactId,
      createdAt: "2026-07-30T11:00:00.000Z",
      activatedAt: "2026-07-30T11:05:00.000Z",
    },
    artifact: {
      manifest: {
        schemaVersion: 1,
        artifactId,
        runtimeVersion: "onborn-runtime-1",
        format: "onborn-ui-ir-v1",
        target: "universal",
        source,
        entry: { documentFile: FILE.path },
        files: [FILE],
        requiredCapabilities: [],
      },
      signature: {
        schemaVersion: 1,
        algorithm: "ed25519",
        keyId: "test",
        manifestHash: "f".repeat(64),
        value: "signature",
      },
    },
  };
}

function sequentialIds(): () => string {
  let value = 0;
  return () => `id-${++value}`;
}

class MemoryStorage implements PersistentUiIrStoragePort {
  private readonly directories = new Set<string>();
  private readonly files = new Map<string, Uint8Array>();

  async ensureDirectory(path: string): Promise<void> {
    this.directories.add(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.directories.has(path) || this.files.has(this.path(path));
  }

  async list(path: string): Promise<string[]> {
    const prefix = `${path}/`;
    return [...this.files.keys()]
      .filter((file) => file.startsWith(prefix))
      .map((file) => file.slice(prefix.length))
      .filter((file) => !file.includes("/"));
  }

  async move(source: string, destination: string): Promise<void> {
    const sourcePath = this.path(source);
    const file = this.files.get(sourcePath);
    if (file) {
      this.files.set(this.path(destination), file);
      this.files.delete(sourcePath);
      return;
    }
    const prefix = `${source}/`;
    for (const [path, bytes] of [...this.files]) {
      if (!path.startsWith(prefix)) continue;
      this.files.set(`${destination}/${path.slice(prefix.length)}`, bytes);
      this.files.delete(path);
    }
    this.directories.add(destination);
  }

  async readBytes(path: string): Promise<Uint8Array> {
    const value = this.files.get(this.path(path));
    if (!value) throw new Error("Missing file");
    return value.slice();
  }

  async readText(path: string): Promise<string> {
    return new TextDecoder().decode(await this.readBytes(path));
  }

  async remove(path: string): Promise<void> {
    const normalized = this.path(path);
    this.files.delete(normalized);
    for (const file of [...this.files.keys()]) {
      if (file.startsWith(`${normalized}/`)) this.files.delete(file);
    }
    this.directories.delete(normalized);
  }

  uri(path: string): string {
    return `memory://${path}`;
  }

  async writeBytes(path: string, bytes: Uint8Array): Promise<void> {
    this.files.set(path, bytes.slice());
  }

  async writeText(path: string, value: string): Promise<void> {
    await this.writeBytes(path, new TextEncoder().encode(value));
  }

  private path(value: string): string {
    return value.startsWith("memory://")
      ? value.slice("memory://".length)
      : value;
  }
}
