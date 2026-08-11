import { BuilderV2UiIrDocumentSchema } from "@onborn/sdk-contracts/builder-v2-ui-ir";

import { UiIrArtifactError } from "../domain/ui-ir-artifact-errors";
import type {
  CachedUiIrArtifact,
  UiIrArtifactCachePort,
} from "../ports/ui-ir-artifact-cache";
import type { UiIrArtifactCryptoPort } from "../ports/ui-ir-artifact-crypto";

export async function loadCachedUiIrDocument(
  cached: CachedUiIrArtifact,
  dependencies: {
    cache: Pick<UiIrArtifactCachePort, "readFile">;
    crypto: Pick<UiIrArtifactCryptoPort, "sha256">;
  },
) {
  const path = cached.artifact.manifest.entry.documentFile;
  const file = cached.files.find(
    (candidate) => candidate.path === path && candidate.role === "document",
  );
  if (!file) {
    throw documentError(`Cached UI IR document "${path}" is missing.`);
  }
  const bytes = await dependencies.cache.readFile(file.uri);
  if (
    !bytes ||
    bytes.byteLength !== file.byteLength ||
    dependencies.crypto.sha256(bytes) !== file.contentHash
  ) {
    throw documentError(`Cached UI IR document "${path}" is corrupted.`);
  }
  try {
    return BuilderV2UiIrDocumentSchema.parse(
      JSON.parse(new TextDecoder().decode(bytes)),
    );
  } catch (error) {
    throw documentError(`Cached UI IR document "${path}" is invalid.`, error);
  }
}

function documentError(message: string, cause?: unknown): UiIrArtifactError {
  return new UiIrArtifactError("document_invalid", message, { cause });
}
