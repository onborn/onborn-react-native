import type { BuilderV2UiIrArtifactDeliveryFile } from "@onborn/sdk-contracts/builder-v2-ui-ir-artifact";
import type {
  CachedUiIrArtifact,
  UiIrArtifactCachePort,
  UiIrArtifactCacheScope,
} from "@onborn/runtime-ui-ir/artifact";

type Stage = {
  scope: UiIrArtifactCacheScope;
  release: CachedUiIrArtifact["release"];
  artifact: CachedUiIrArtifact["artifact"];
  files: Array<{
    metadata: Omit<BuilderV2UiIrArtifactDeliveryFile, "url">;
    bytes: Uint8Array;
  }>;
};

export class InMemoryUiIrArtifactCache implements UiIrArtifactCachePort {
  private readonly active = new Map<string, CachedUiIrArtifact>();
  private readonly stages = new Map<string, Stage>();
  private readonly bytes = new Map<string, Uint8Array>();
  private stageSequence = 0;

  async readActive(
    scope: UiIrArtifactCacheScope,
  ): Promise<CachedUiIrArtifact | null> {
    return this.active.get(scopeKey(scope)) ?? null;
  }

  async readFile(uri: string): Promise<Uint8Array | null> {
    return this.bytes.get(uri)?.slice() ?? null;
  }

  async createStage(input: Omit<Stage, "files">): Promise<string> {
    const id = `stage-${++this.stageSequence}`;
    this.stages.set(id, { ...input, files: [] });
    return id;
  }

  async writeStageFile(input: {
    stageId: string;
    file: Omit<BuilderV2UiIrArtifactDeliveryFile, "url">;
    bytes: Uint8Array;
  }): Promise<void> {
    this.requireStage(input.stageId).files.push({
      metadata: input.file,
      bytes: input.bytes.slice(),
    });
  }

  async activateStage(stageId: string): Promise<CachedUiIrArtifact> {
    const stage = this.requireStage(stageId);
    const files = stage.files.map(({ metadata, bytes }) => {
      const uri = `memory://${stage.artifact.manifest.artifactId}/${metadata.path}`;
      this.bytes.set(uri, bytes.slice());
      return { ...metadata, uri };
    });
    const cached: CachedUiIrArtifact = {
      release: stage.release,
      artifact: stage.artifact,
      files,
      activatedAt: new Date().toISOString(),
    };
    this.active.set(scopeKey(stage.scope), cached);
    this.stages.delete(stageId);
    return cached;
  }

  async discardStage(stageId: string): Promise<void> {
    this.stages.delete(stageId);
  }

  seed(scope: UiIrArtifactCacheScope, cached: CachedUiIrArtifact): void {
    this.active.set(scopeKey(scope), cached);
  }

  seedFile(uri: string, contents: Uint8Array): void {
    this.bytes.set(uri, contents.slice());
  }

  private requireStage(stageId: string): Stage {
    const stage = this.stages.get(stageId);
    if (!stage) throw new Error(`Unknown UI IR stage "${stageId}".`);
    return stage;
  }
}

function scopeKey(scope: UiIrArtifactCacheScope): string {
  return `${scope.flowId}:${scope.environment}`;
}
