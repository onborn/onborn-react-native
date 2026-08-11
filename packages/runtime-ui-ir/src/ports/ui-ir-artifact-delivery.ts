import type { BuilderV2ArtifactTarget } from "@onborn/sdk-contracts/builder-v2-runtime-platform";

export interface UiIrArtifactDeliveryPort {
  fetchArtifact(input: {
    flowId: string;
    target: BuilderV2ArtifactTarget;
  }): Promise<unknown>;
  downloadFile(url: string): Promise<Uint8Array>;
}
