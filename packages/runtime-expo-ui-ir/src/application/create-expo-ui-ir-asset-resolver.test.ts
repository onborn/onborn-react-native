import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CachedUiIrArtifact } from "@onborn/runtime-ui-ir/artifact";

import { createExpoUiIrAssetResolver } from "./create-expo-ui-ir-asset-resolver";

describe("createExpoUiIrAssetResolver", () => {
  it("resolves only cache files matching the signed asset metadata", () => {
    const resolver = createExpoUiIrAssetResolver({
      files: [
        {
          path: "assets/hero.webp",
          role: "asset",
          contentHash: "a".repeat(64),
          byteLength: 42,
          uri: "file:///cache/assets/hero.webp",
        },
      ],
    } as CachedUiIrArtifact);

    assert.deepEqual(
      resolver({
        assetId: "hero",
        file: "assets/hero.webp",
        mediaType: "image/webp",
        contentHash: "a".repeat(64),
        byteLength: 42,
      }),
      { uri: "file:///cache/assets/hero.webp" },
    );
  });

  it("rejects an asset whose document metadata differs from the cache", () => {
    const resolver = createExpoUiIrAssetResolver({
      files: [
        {
          path: "assets/hero.webp",
          role: "asset",
          contentHash: "a".repeat(64),
          byteLength: 42,
          uri: "file:///cache/assets/hero.webp",
        },
      ],
    } as CachedUiIrArtifact);

    assert.throws(
      () =>
        resolver({
          assetId: "hero",
          file: "assets/hero.webp",
          mediaType: "image/webp",
          contentHash: "b".repeat(64),
          byteLength: 42,
        }),
      /missing or does not match its manifest/,
    );
  });
});
