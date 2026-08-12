import type {
  BuilderV2ArtifactTarget,
  BuilderV2UiIrHostManifest,
} from "@onborn/sdk-contracts";

const BUILT_IN_CAPABILITIES: BuilderV2UiIrHostManifest["capabilities"] = [
  { name: "analytics", version: 1 },
  { name: "assets", version: 1 },
  { name: "billing", version: 1 },
  // Declared only because the expo runtime now loads artifact-embedded fonts
  // at session start; a host manifest is a promise, not a wish.
  { name: "google-fonts", version: 1 },
  { name: "image", version: 1 },
  { name: "localization", version: 1 },
  { name: "navigation", version: 1 },
  { name: "safe-area", version: 1 },
];

export function createBuilderV2HostManifest(
  target: Extract<BuilderV2ArtifactTarget, "ios" | "android">,
): BuilderV2UiIrHostManifest {
  return {
    schemaVersion: 1,
    runtimeVersion: "onborn-runtime-1",
    target,
    capabilities: BUILT_IN_CAPABILITIES,
  };
}
