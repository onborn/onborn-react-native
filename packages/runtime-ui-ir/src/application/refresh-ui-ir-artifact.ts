import {
  BuilderV2UiIrArtifactDeliverySchema,
  type BuilderV2UiIrArtifactDelivery,
} from "@onborn/sdk-contracts/builder-v2-ui-ir-artifact";
import {
  evaluateBuilderV2UiIrCompatibility,
  type BuilderV2UiIrHostManifest,
} from "@onborn/sdk-contracts/builder-v2-ui-ir-runtime";

import { canonicalJson } from "../domain/canonical-json";
import {
  UiIrArtifactError,
  type UiIrArtifactFailureCode,
} from "../domain/ui-ir-artifact-errors";
import type {
  CachedUiIrArtifact,
  UiIrArtifactCachePort,
  UiIrArtifactCacheScope,
} from "../ports/ui-ir-artifact-cache";
import type { UiIrArtifactClockPort } from "../ports/ui-ir-artifact-clock";
import type { UiIrArtifactCryptoPort } from "../ports/ui-ir-artifact-crypto";
import type { UiIrArtifactDeliveryPort } from "../ports/ui-ir-artifact-delivery";

export type RefreshUiIrArtifactResult = {
  artifact: CachedUiIrArtifact;
  source: "network" | "last-known-good" | "cache-current";
  failureCode?: UiIrArtifactFailureCode;
};

export async function refreshUiIrArtifact(
  input: {
    flowId: string;
    environment: "test" | "prod";
    host: BuilderV2UiIrHostManifest;
  },
  dependencies: {
    cache: UiIrArtifactCachePort;
    clock?: UiIrArtifactClockPort;
    crypto: UiIrArtifactCryptoPort;
    delivery: UiIrArtifactDeliveryPort;
  },
): Promise<RefreshUiIrArtifactResult> {
  const scope = cacheScope(input);
  const lastKnownGood = await dependencies.cache.readActive(scope);
  let stageId: string | null = null;

  try {
    const delivery = parseDelivery(
      await dependencies.delivery.fetchArtifact({
        flowId: input.flowId,
        target: input.host.target,
      }),
    );
    assertDeliveryScope(delivery, scope, input.host.target);
    assertDeliveryFresh(delivery, dependencies.clock?.now() ?? Date.now());
    assertCompatibility(delivery, input.host);
    await verifyArtifact(delivery, dependencies.crypto);
    /*
     * The server just named the release; if it is the one already activated on
     * disk, there is nothing to download. Every mount used to re-fetch every
     * file — document, image, fonts — for an artifact that had not changed,
     * which is most of the spinner someone re-watching the onboarding sat
     * through. The cached copy was integrity-checked file by file when it was
     * staged, and the signature above proves the server's claim is authentic.
     */
    if (
      lastKnownGood &&
      lastKnownGood.release.releaseId === delivery.release.releaseId &&
      lastKnownGood.artifact.manifest.artifactId ===
        delivery.artifact.manifest.artifactId
    ) {
      return { artifact: lastKnownGood, source: "cache-current" };
    }
    stageId = await stageDelivery(delivery, scope, dependencies);
    return {
      artifact: await dependencies.cache.activateStage(stageId),
      source: "network",
    };
  } catch (error) {
    if (stageId) {
      await dependencies.cache.discardStage(stageId).catch(() => undefined);
    }
    const failure = normalizeError(error);
    if (lastKnownGood) {
      assertCachedCompatibility(lastKnownGood, input.host);
      return {
        artifact: lastKnownGood,
        source: "last-known-good",
        failureCode: failure.code,
      };
    }
    throw failure;
  }
}

function cacheScope(input: {
  flowId: string;
  environment: "test" | "prod";
}): UiIrArtifactCacheScope {
  return { flowId: input.flowId, environment: input.environment };
}

function parseDelivery(input: unknown): BuilderV2UiIrArtifactDelivery {
  const parsed = BuilderV2UiIrArtifactDeliverySchema.safeParse(input);
  if (!parsed.success) {
    throw new UiIrArtifactError(
      "delivery_invalid",
      "Builder V2 UI IR delivery response is invalid.",
      { cause: parsed.error },
    );
  }
  return parsed.data;
}

function assertDeliveryScope(
  delivery: BuilderV2UiIrArtifactDelivery,
  scope: UiIrArtifactCacheScope,
  target: BuilderV2UiIrHostManifest["target"],
): void {
  if (
    delivery.release.flowId !== scope.flowId ||
    delivery.release.environment !== scope.environment ||
    delivery.requestedTarget !== target
  ) {
    throw new UiIrArtifactError(
      "delivery_scope_mismatch",
      "Builder V2 UI IR delivery does not match the requested runtime scope.",
    );
  }
}

function assertDeliveryFresh(
  delivery: BuilderV2UiIrArtifactDelivery,
  now: number,
): void {
  if (Date.parse(delivery.expiresAt) <= now) {
    throw new UiIrArtifactError(
      "delivery_expired",
      "Builder V2 UI IR delivery URLs have expired.",
    );
  }
}

function assertCompatibility(
  delivery: BuilderV2UiIrArtifactDelivery,
  host: BuilderV2UiIrHostManifest,
): void {
  const result = evaluateBuilderV2UiIrCompatibility(
    delivery.artifact.manifest,
    delivery.requestedTarget,
    host,
  );
  if (!result.compatible) {
    throw new UiIrArtifactError(
      "runtime_incompatible",
      `Builder V2 UI IR is incompatible with this host: ${result.issues
        .map((issue) => issue.code)
        .join(", ")}.`,
    );
  }
}

function assertCachedCompatibility(
  cached: CachedUiIrArtifact,
  host: BuilderV2UiIrHostManifest,
): void {
  const result = evaluateBuilderV2UiIrCompatibility(
    cached.artifact.manifest,
    host.target,
    host,
  );
  if (!result.compatible) {
    throw new UiIrArtifactError(
      "runtime_incompatible",
      "The last-known-good UI IR is incompatible with this host.",
    );
  }
}

async function verifyArtifact(
  delivery: BuilderV2UiIrArtifactDelivery,
  crypto: UiIrArtifactCryptoPort,
): Promise<void> {
  const { artifactId, ...identity } = delivery.artifact.manifest;
  if (crypto.sha256(canonicalJson(identity)) !== artifactId) {
    throw new UiIrArtifactError(
      "manifest_integrity_failed",
      "Builder V2 UI IR artifact identity hash is invalid.",
    );
  }
  const { manifest, signature } = delivery.artifact;
  const manifestHash = crypto.sha256(canonicalJson(manifest));
  if (signature.manifestHash !== manifestHash) {
    throw new UiIrArtifactError(
      "manifest_integrity_failed",
      "Builder V2 UI IR manifest hash is invalid.",
    );
  }
  const payload = canonicalJson({
    schemaVersion: signature.schemaVersion,
    algorithm: signature.algorithm,
    keyId: signature.keyId,
    manifestHash,
  });
  if (
    !(await crypto.verifyEd25519({
      keyId: signature.keyId,
      payload,
      signature: signature.value,
    }))
  ) {
    throw new UiIrArtifactError(
      "signature_invalid",
      "Builder V2 UI IR signature is invalid or untrusted.",
    );
  }
}

async function stageDelivery(
  delivery: BuilderV2UiIrArtifactDelivery,
  scope: UiIrArtifactCacheScope,
  dependencies: {
    cache: UiIrArtifactCachePort;
    crypto: UiIrArtifactCryptoPort;
    delivery: UiIrArtifactDeliveryPort;
  },
): Promise<string> {
  const stageId = await dependencies.cache.createStage({
    scope,
    release: delivery.release,
    artifact: delivery.artifact,
  });
  try {
    for (const file of delivery.files) {
      const bytes = await downloadFile(file, dependencies);
      await dependencies.cache.writeStageFile({
        stageId,
        file: {
          path: file.path,
          role: file.role,
          contentHash: file.contentHash,
          byteLength: file.byteLength,
        },
        bytes,
      });
    }
    return stageId;
  } catch (error) {
    await dependencies.cache.discardStage(stageId).catch(() => undefined);
    throw error;
  }
}

async function downloadFile(
  file: BuilderV2UiIrArtifactDelivery["files"][number],
  dependencies: {
    crypto: UiIrArtifactCryptoPort;
    delivery: UiIrArtifactDeliveryPort;
  },
): Promise<Uint8Array> {
  let bytes: Uint8Array;
  try {
    bytes = await dependencies.delivery.downloadFile(file.url);
  } catch (error) {
    throw new UiIrArtifactError(
      "download_failed",
      `Could not download UI IR file "${file.path}".`,
      { cause: error },
    );
  }
  if (
    bytes.byteLength !== file.byteLength ||
    dependencies.crypto.sha256(bytes) !== file.contentHash
  ) {
    throw new UiIrArtifactError(
      "file_integrity_failed",
      `UI IR file "${file.path}" failed integrity validation.`,
    );
  }
  return bytes;
}

function normalizeError(error: unknown): UiIrArtifactError {
  return error instanceof UiIrArtifactError
    ? error
    : new UiIrArtifactError(
        "cache_activation_failed",
        "Builder V2 UI IR could not be staged or activated.",
        { cause: error },
      );
}
