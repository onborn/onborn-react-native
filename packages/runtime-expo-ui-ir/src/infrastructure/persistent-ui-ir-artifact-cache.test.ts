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

  it("resolves file URIs against the current container, not the recorded one", async () => {
    /*
     * iOS moves the app's data container to a new UUID path on every app
     * update: the cached files survive, but an absolute file:// URI recorded
     * at activation time keeps pointing at the old container. Measured on a
     * real device as `Cached UI IR document "ui-ir/document.json" is
     * corrupted` on the first launch after an update.
     */
    const state = new MemoryStorageState();
    const cache = new PersistentUiIrArtifactCache({
      storage: new MemoryStorage(state, "container-a"),
      createId: sequentialIds(),
    });
    const stageId = await cache.createStage(fixture());
    await cache.writeStageFile({ stageId, file: FILE, bytes: DOCUMENT_BYTES });
    await cache.activateStage(stageId);

    const relocated = new PersistentUiIrArtifactCache({
      storage: new MemoryStorage(state, "container-b"),
      createId: sequentialIds(),
    });
    const active = await relocated.readActive({
      flowId: "flow-1",
      environment: "test",
    });

    assert.ok(active!.files[0]!.uri.startsWith("memory://container-b/"));
    assert.deepEqual(
      await relocated.readFile(active!.files[0]!.uri),
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

class MemoryStorageState {
  readonly directories = new Set<string>();
  readonly files = new Map<string, Uint8Array>();
}

/*
 * Absolute URIs carry the container they were minted in, like the file://
 * URIs of the real storage carry the iOS data container UUID. A URI from
 * another container does not resolve — that is the behavior the relocation
 * test depends on, so it must not be softened.
 */
class MemoryStorage implements PersistentUiIrStoragePort {
  private readonly directories: Set<string>;
  private readonly files: Map<string, Uint8Array>;

  constructor(
    state = new MemoryStorageState(),
    private readonly container = "container-a",
  ) {
    this.directories = state.directories;
    this.files = state.files;
  }

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
    return `memory://${this.container}/${path}`;
  }

  async writeBytes(path: string, bytes: Uint8Array): Promise<void> {
    this.files.set(this.path(path), bytes.slice());
  }

  async writeText(path: string, value: string): Promise<void> {
    await this.writeBytes(path, new TextEncoder().encode(value));
  }

  private path(value: string): string {
    if (!value.startsWith("memory://")) return value;
    const prefix = `memory://${this.container}/`;
    if (!value.startsWith(prefix)) {
      throw new Error(`URI from a foreign container: "${value}".`);
    }
    return value.slice(prefix.length);
  }
}
