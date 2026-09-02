import {
  BuilderV2UiIrArtifactDeliverySchema,
  type BuilderV2UiIrArtifactDelivery,
} from "@onborn/sdk-contracts/builder-v2-ui-ir-artifact";
import {
  evaluateBuilderV2UiIrCompatibility,
  type BuilderV2UiIrHostManifest,
} from "@onborn/sdk-contracts/builder-v2-ui-ir-runtime";

import { canonicalJson } from "../domain/canonical-json";
import { createUiIrLoadTrace } from "../domain/ui-ir-load-trace";
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
  /**
   * The experiment assignment the delivery named for this person. Present on
   * the network paths (the server just said it); absent on last-known-good —
   * an offline runtime does not guess which arm it is on, and untagged
   * events simply stay out of the experiment's readout.
   */
  experiment?: BuilderV2UiIrArtifactDelivery["experiment"];
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
  const trace = createUiIrLoadTrace(`refresh ${input.flowId.slice(0, 8)}`);
  const lastKnownGood = await dependencies.cache.readActive(scope);
  trace.mark("read cached state");
  let stageId: string | null = null;

  try {
    const delivery = parseDelivery(
      await dependencies.delivery.fetchArtifact({
        flowId: input.flowId,
        target: input.host.target,
      }),
    );
    trace.mark("delivery fetched+parsed");
    assertDeliveryScope(delivery, scope, input.host.target);
    assertDeliveryFresh(delivery, dependencies.clock?.now() ?? Date.now());
    assertCompatibility(delivery, input.host);
    await verifyArtifact(delivery, dependencies.crypto);
    trace.mark("signature verified");
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
        delivery.artifact.manifest.artifactId &&
      (await cachedArtifactReadsBack(lastKnownGood, dependencies))
    ) {
      trace.mark("cache-current check");
      trace.end();
      return {
        artifact: lastKnownGood,
        source: "cache-current",
        ...(delivery.experiment ? { experiment: delivery.experiment } : {}),
      };
    }
    stageId = await stageDelivery(delivery, scope, dependencies);
    trace.mark("files downloaded+verified+staged");
    const activated = await dependencies.cache.activateStage(stageId);
    trace.mark("stage activated");
    trace.end();
    return {
      artifact: activated,
      source: "network",
      ...(delivery.experiment ? { experiment: delivery.experiment } : {}),
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

/*
 * Whether the activated cache still holds what it claims to.
 *
 * This used to re-read and re-hash every file on every warm start — hashing
 * a hero JPEG in pure JS each launch was most of the wait on a flow that had
 * not changed. Every file was already hash-verified when it was staged, and
 * the document is hash-verified again by loadCachedUiIrDocument before it is
 * parsed, so the cheap check is enough here: document files keep the full
 * read-back, everything else only has to still exist (via the cache's
 * `hasFile` when it offers one; caches that don't keep the full read-back).
 */
async function cachedArtifactReadsBack(
  cached: CachedUiIrArtifact,
  dependencies: {
    cache: Pick<UiIrArtifactCachePort, "readFile" | "hasFile">;
    crypto: Pick<UiIrArtifactCryptoPort, "sha256">;
  },
): Promise<boolean> {
  const checks = cached.files.map(async (file) => {
    if (file.role !== "document" && dependencies.cache.hasFile) {
      return dependencies.cache.hasFile(file.uri);
    }
    const bytes = await dependencies.cache.readFile(file.uri);
    return (
      bytes !== null &&
      bytes.byteLength === file.byteLength &&
      (await dependencies.crypto.sha256(bytes)) === file.contentHash
    );
  });
  return (await Promise.all(checks)).every(Boolean);
}

async function verifyArtifact(
  delivery: BuilderV2UiIrArtifactDelivery,
  crypto: UiIrArtifactCryptoPort,
): Promise<void> {
  const { artifactId, ...identity } = delivery.artifact.manifest;
  if ((await crypto.sha256(canonicalJson(identity))) !== artifactId) {
    throw new UiIrArtifactError(
      "manifest_integrity_failed",
      "Builder V2 UI IR artifact identity hash is invalid.",
    );
  }
  const { manifest, signature } = delivery.artifact;
  const manifestHash = await crypto.sha256(canonicalJson(manifest));
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
    /*
     * All files at once. Downloading sequentially paid a full network round
     * trip per file — document, hero image, every font — which was most of a
     * cold start. Verification stays per-file inside downloadFile, and the
     * cache serializes its own writes.
     */
    await Promise.all(
      delivery.files.map(async (file) => {
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
      }),
    );
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
    // The delivery may carry small critical files inline (the document);
    // those bytes skip the network entirely and still face the same hash
    // check below — where they came from proves nothing, the hash does.
    bytes = file.contents
      ? base64ToBytes(file.contents)
      : await dependencies.delivery.downloadFile(file.url);
  } catch (error) {
    throw new UiIrArtifactError(
      "download_failed",
      `Could not download UI IR file "${file.path}".`,
      { cause: error },
    );
  }
  if (
    bytes.byteLength !== file.byteLength ||
    (await dependencies.crypto.sha256(bytes)) !== file.contentHash
  ) {
    throw new UiIrArtifactError(
      "file_integrity_failed",
      `UI IR file "${file.path}" failed integrity validation.`,
    );
  }
  return bytes;
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
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
