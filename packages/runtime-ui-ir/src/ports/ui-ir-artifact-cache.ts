import type {
  BuilderV2UiIrArtifactDeliveryFile,
  BuilderV2UiIrRelease,
  BuilderV2SignedUiIrArtifact,
} from "@onborn/sdk-contracts/builder-v2-ui-ir-artifact";

export type UiIrArtifactCacheScope = {
  flowId: string;
  environment: "test" | "prod";
};

export type CachedUiIrArtifactFile = Omit<
  BuilderV2UiIrArtifactDeliveryFile,
  "url"
> & {
  uri: string;
};

export type CachedUiIrArtifact = {
  release: BuilderV2UiIrRelease;
  artifact: BuilderV2SignedUiIrArtifact;
  files: CachedUiIrArtifactFile[];
  activatedAt: string;
};

export interface UiIrArtifactCachePort {
  readActive(scope: UiIrArtifactCacheScope): Promise<CachedUiIrArtifact | null>;
  readFile(uri: string): Promise<Uint8Array | null>;
  /**
   * Whether a cached file still exists, without reading its bytes.
   *
   * Optional fast path for the warm-start cache check: files were
   * hash-verified when staged, so on later launches presence is enough for
   * everything except the document. A cache that cannot answer cheaply omits
   * this and the caller falls back to reading the bytes.
   */
  hasFile?(uri: string): Promise<boolean>;
  createStage(input: {
    scope: UiIrArtifactCacheScope;
    release: BuilderV2UiIrRelease;
    artifact: BuilderV2SignedUiIrArtifact;
  }): Promise<string>;
  writeStageFile(input: {
    stageId: string;
    file: Omit<BuilderV2UiIrArtifactDeliveryFile, "url">;
    bytes: Uint8Array;
  }): Promise<void>;
  activateStage(stageId: string): Promise<CachedUiIrArtifact>;
  discardStage(stageId: string): Promise<void>;
}
