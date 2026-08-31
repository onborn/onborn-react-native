import type { ImageSourcePropType } from "react-native";

import type { BuilderV2UiIrAsset } from "@onborn/sdk-contracts/builder-v2-ui-ir";

import type { CachedUiIrArtifact } from "../ports/ui-ir-artifact-cache";

/**
 * Resolves an artifact's assets to the URIs the cache staged them at.
 *
 * Platform-neutral on purpose: the cache decides what a URI is — a file on
 * the device, a blob URL in a browser — and the image component on either
 * platform loads it. Lived in the Expo package first, where nothing about it
 * was Expo's.
 */
export function createUiIrAssetResolver(
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
