import type {
  CachedUiIrArtifact,
  UiIrArtifactCachePort,
  UiIrArtifactCacheScope,
} from "@onborn/runtime-ui-ir/artifact";
import type {
  BuilderV2UiIrArtifactDeliveryFile,
  BuilderV2UiIrArtifactFile,
  BuilderV2UiIrRelease,
  BuilderV2SignedUiIrArtifact,
} from "@onborn/sdk-contracts/builder-v2-ui-ir-artifact";

import {
  CachedUiIrArtifactSchema,
  UiIrArtifactStageSchema,
} from "../domain/persisted-ui-ir-records";
import {
  assertSafeUiIrIdentifier,
  assertSafeUiIrPath,
  uiIrScopeStorageKey,
  uiIrStorageError,
} from "../domain/ui-ir-storage-paths";
import type { PersistentUiIrStoragePort } from "../ports/persistent-ui-ir-storage";
import { AsyncMutex } from "./async-mutex";

type StageRecord = {
  scope: UiIrArtifactCacheScope;
  release: BuilderV2UiIrRelease;
  artifact: BuilderV2SignedUiIrArtifact;
  files: BuilderV2UiIrArtifactFile[];
};

export type PersistentUiIrArtifactCacheOptions = {
  storage: PersistentUiIrStoragePort;
  createId: () => string;
  now?: () => number;
};

export class PersistentUiIrArtifactCache implements UiIrArtifactCachePort {
  private readonly mutex = new AsyncMutex();
  private readonly now: () => number;

  constructor(private readonly options: PersistentUiIrArtifactCacheOptions) {
    this.now = options.now ?? Date.now;
  }

  async readActive(
    scope: UiIrArtifactCacheScope,
  ): Promise<CachedUiIrArtifact | null> {
    const directory = `active/${uiIrScopeStorageKey(scope)}`;
    if (!(await this.options.storage.exists(directory))) return null;
    const pointers = (await this.options.storage.list(directory))
      .filter((name) => name.endsWith(".json"))
      .sort()
      .reverse();
    const latest = pointers[0];
    return latest ? this.readCachedArtifact(`${directory}/${latest}`) : null;
  }

  async readFile(uri: string): Promise<Uint8Array | null> {
    try {
      return await this.options.storage.readBytes(uri);
    } catch {
      return null;
    }
  }

  async hasFile(uri: string): Promise<boolean> {
    try {
      return await this.options.storage.exists(uri);
    } catch {
      return false;
    }
  }

  async createStage(input: {
    scope: UiIrArtifactCacheScope;
    release: BuilderV2UiIrRelease;
    artifact: BuilderV2SignedUiIrArtifact;
  }): Promise<string> {
    const stageId = this.nextId("stage ID");
    const directory = stageDirectory(stageId);
    await this.options.storage.ensureDirectory(`${directory}/files`);
    await this.writeStage(stageId, { ...input, files: [] });
    return stageId;
  }

  async writeStageFile(input: {
    stageId: string;
    file: Omit<BuilderV2UiIrArtifactDeliveryFile, "url">;
    bytes: Uint8Array;
  }): Promise<void> {
    await this.mutex.run(async () => {
      const stage = await this.readStage(input.stageId);
      const path = assertSafeUiIrPath(input.file.path);
      if (stage.files.some((file) => file.path === path)) {
        throw uiIrStorageError(
          `UI IR artifact stage already contains "${path}".`,
        );
      }
      await this.options.storage.writeBytes(
        `${stageDirectory(input.stageId)}/files/${path}`,
        input.bytes,
      );
      await this.writeStage(input.stageId, {
        ...stage,
        files: [...stage.files, input.file],
      });
    });
  }

  async activateStage(stageId: string): Promise<CachedUiIrArtifact> {
    return this.mutex.run(async () => {
      const stage = await this.readStage(stageId);
      assertCompleteStage(stage);
      const artifact = await this.materializeArtifact(stageId, stage);
      await this.writeActivePointer(stage.scope, artifact);
      await this.options.storage.remove(stageDirectory(stageId));
      return artifact;
    });
  }

  async discardStage(stageId: string): Promise<void> {
    await this.options.storage.remove(
      stageDirectory(assertSafeUiIrIdentifier(stageId, "stage ID")),
    );
  }

  private async materializeArtifact(
    stageId: string,
    stage: StageRecord,
  ): Promise<CachedUiIrArtifact> {
    const artifactId = stage.artifact.manifest.artifactId;
    const directory = `artifacts/${artifactId}`;
    const recordPath = `${directory}/artifact.json`;
    if (await this.options.storage.exists(recordPath)) {
      return this.readCachedArtifact(recordPath);
    }
    if (await this.options.storage.exists(directory)) {
      await this.options.storage.remove(directory);
    }
    const artifact: CachedUiIrArtifact = {
      release: stage.release,
      artifact: stage.artifact,
      files: stage.files.map((file) => ({
        ...file,
        uri: this.options.storage.uri(`${directory}/files/${file.path}`),
      })),
      activatedAt: new Date(this.now()).toISOString(),
    };
    await this.options.storage.writeText(
      `${stageDirectory(stageId)}/artifact.json`,
      JSON.stringify(artifact),
    );
    await this.options.storage.ensureDirectory("artifacts");
    await this.options.storage.move(stageDirectory(stageId), directory);
    return artifact;
  }

  private async writeActivePointer(
    scope: UiIrArtifactCacheScope,
    artifact: CachedUiIrArtifact,
  ): Promise<void> {
    const directory = `active/${uiIrScopeStorageKey(scope)}`;
    const sequence = String(this.now()).padStart(16, "0");
    const pointerId = this.nextId("activation ID");
    const temporaryPath = `active-staging/${pointerId}.json`;
    await this.options.storage.ensureDirectory(directory);
    await this.options.storage.writeText(
      temporaryPath,
      JSON.stringify(artifact),
    );
    await this.options.storage.move(
      temporaryPath,
      `${directory}/${sequence}-${pointerId}.json`,
    );
  }

  private async readStage(stageId: string): Promise<StageRecord> {
    const safeId = assertSafeUiIrIdentifier(stageId, "stage ID");
    try {
      return UiIrArtifactStageSchema.parse(
        JSON.parse(
          await this.options.storage.readText(
            `${stageDirectory(safeId)}/stage.json`,
          ),
        ),
      );
    } catch (error) {
      throw uiIrStorageError("UI IR artifact stage is invalid.", error);
    }
  }

  private async writeStage(stageId: string, stage: StageRecord): Promise<void> {
    await this.options.storage.writeText(
      `${stageDirectory(stageId)}/stage.json`,
      JSON.stringify(stage),
    );
  }

  private async readCachedArtifact(path: string): Promise<CachedUiIrArtifact> {
    let record: CachedUiIrArtifact;
    try {
      record = CachedUiIrArtifactSchema.parse(
        JSON.parse(await this.options.storage.readText(path)),
      );
    } catch (error) {
      throw uiIrStorageError("Cached UI IR artifact is invalid.", error);
    }
    /*
     * The recorded URIs are absolute and carry the data container they were
     * minted in; iOS moves that container to a new UUID path on every app
     * update, so they go stale while the files themselves survive. The layout
     * under the root is ours, so the URI is derived from it on every read
     * instead of trusted from the record.
     */
    const directory = `artifacts/${record.artifact.manifest.artifactId}`;
    return {
      ...record,
      files: record.files.map((file) => ({
        ...file,
        uri: this.options.storage.uri(
          `${directory}/files/${assertSafeUiIrPath(file.path)}`,
        ),
      })),
    };
  }

  private nextId(label: string): string {
    return assertSafeUiIrIdentifier(this.options.createId(), label);
  }
}

function stageDirectory(stageId: string): string {
  return `stages/${stageId}`;
}

function assertCompleteStage(stage: StageRecord): void {
  const expected = new Map(
    stage.artifact.manifest.files.map((file) => [file.path, file]),
  );
  if (expected.size !== stage.files.length) {
    throw uiIrStorageError("UI IR artifact stage is incomplete.");
  }
  for (const file of stage.files) {
    const match = expected.get(file.path);
    if (
      !match ||
      match.role !== file.role ||
      match.contentHash !== file.contentHash ||
      match.byteLength !== file.byteLength
    ) {
      throw uiIrStorageError(
        "UI IR artifact stage does not match its manifest.",
      );
    }
  }
}
