import type { BuilderV2RuntimeHealthEvent } from "@onborn/sdk-contracts/builder-v2-runtime-control";
import type { BuilderV2UiIrHostManifest } from "@onborn/sdk-contracts/builder-v2-ui-ir-runtime";

import { UiIrArtifactError } from "../domain/ui-ir-artifact-errors";
import type { UiIrArtifactCachePort } from "../ports/ui-ir-artifact-cache";
import type { UiIrArtifactClockPort } from "../ports/ui-ir-artifact-clock";
import type { UiIrArtifactCryptoPort } from "../ports/ui-ir-artifact-crypto";
import type { UiIrArtifactDeliveryPort } from "../ports/ui-ir-artifact-delivery";
import type { UiIrRuntimeControlPort } from "../ports/ui-ir-runtime-control";
import type { UiIrRuntimeDiagnosticsPort } from "../ports/ui-ir-runtime-diagnostics";
import {
  refreshUiIrArtifact,
  type RefreshUiIrArtifactResult,
} from "./refresh-ui-ir-artifact";

type LoadInput = {
  flowId: string;
  environment: "test" | "prod";
  host: BuilderV2UiIrHostManifest;
};

type LoadDependencies = {
  cache: UiIrArtifactCachePort;
  clock?: UiIrArtifactClockPort;
  control?: UiIrRuntimeControlPort;
  crypto: UiIrArtifactCryptoPort;
  delivery: UiIrArtifactDeliveryPort;
  diagnostics?: UiIrRuntimeDiagnosticsPort;
};

export async function loadUiIrArtifactSession(
  input: LoadInput,
  dependencies: LoadDependencies,
): Promise<RefreshUiIrArtifactResult> {
  const startedAt = dependencies.clock?.now() ?? Date.now();
  await assertRuntimeEnabled(input, dependencies, startedAt);

  try {
    const result = await refreshUiIrArtifact(input, dependencies);
    await report(dependencies.diagnostics, {
      ...baseEvent(input, dependencies, startedAt),
      event: "load_succeeded",
      source: result.source,
      artifactId: result.artifact.artifact.manifest.artifactId,
      releaseId: result.artifact.release.releaseId,
      fallbackUsed: result.source === "last-known-good",
      ...(result.failureCode ? { failureCode: result.failureCode } : {}),
    });
    return result;
  } catch (error) {
    await report(dependencies.diagnostics, {
      ...baseEvent(input, dependencies, startedAt),
      event: "load_failed",
      failureCode:
        error instanceof UiIrArtifactError ? error.code : "load_failed",
      fallbackUsed: false,
    });
    throw error;
  }
}

async function assertRuntimeEnabled(
  input: LoadInput,
  dependencies: LoadDependencies,
  startedAt: number,
): Promise<void> {
  if (!dependencies.control) return;
  try {
    const control = await dependencies.control.resolve({
      flowId: input.flowId,
      environment: input.environment,
      target: nativeTarget(input.host),
    });
    if (control.enabled) return;
    const error = new UiIrArtifactError(
      "runtime_disabled",
      `Builder V2 UI IR runtime is disabled (${control.reason ?? "unspecified"}).`,
    );
    await report(dependencies.diagnostics, {
      ...baseEvent(input, dependencies, startedAt),
      event: "runtime_blocked",
      failureCode: error.code,
      fallbackUsed: false,
    });
    throw error;
  } catch (error) {
    if (
      error instanceof UiIrArtifactError &&
      error.code === "runtime_disabled"
    ) {
      throw error;
    }
    await report(dependencies.diagnostics, {
      ...baseEvent(input, dependencies, startedAt),
      event: "control_check_failed",
      failureCode: "control_check_failed",
      fallbackUsed: true,
    });
  }
}

function baseEvent(
  input: LoadInput,
  dependencies: LoadDependencies,
  startedAt: number,
): Omit<BuilderV2RuntimeHealthEvent, "event"> {
  const now = dependencies.clock?.now() ?? Date.now();
  return {
    schemaVersion: 1,
    flowId: input.flowId,
    environment: input.environment,
    target: nativeTarget(input.host),
    occurredAt: new Date(now).toISOString(),
    durationMs: Math.max(0, Math.round(now - startedAt)),
  };
}

function nativeTarget(host: BuilderV2UiIrHostManifest): "ios" | "android" {
  if (host.target !== "ios" && host.target !== "android") {
    throw new UiIrArtifactError(
      "runtime_incompatible",
      `UI IR runtime control requires a native target, received "${host.target}".`,
    );
  }
  return host.target;
}

async function report(
  diagnostics: UiIrRuntimeDiagnosticsPort | undefined,
  event: BuilderV2RuntimeHealthEvent,
): Promise<void> {
  await Promise.resolve(diagnostics?.report(event)).catch(() => undefined);
}
