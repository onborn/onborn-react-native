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
