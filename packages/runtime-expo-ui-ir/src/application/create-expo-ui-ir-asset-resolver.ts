import type { CachedUiIrArtifact } from "@onborn/runtime-ui-ir/artifact";
import type { BuilderV2UiIrAsset } from "@onborn/sdk-contracts";
import type { ImageSourcePropType } from "react-native";

export function createExpoUiIrAssetResolver(
  artifact: CachedUiIrArtifact,
): (asset: BuilderV2UiIrAsset) => ImageSourcePropType {
  const files = new Map(
    artifact.files
      .filter((file) => file.role === "asset")
      .map((file) => [file.path, file]),
  );

  return (asset) => {
    const file = files.get(asset.file);
    if (
      !file ||
      file.contentHash !== asset.contentHash ||
      file.byteLength !== asset.byteLength
    ) {
      throw new Error(
        `UI IR asset "${asset.assetId}" is missing or does not match its manifest.`,
      );
    }
    return { uri: file.uri };
  };
}
