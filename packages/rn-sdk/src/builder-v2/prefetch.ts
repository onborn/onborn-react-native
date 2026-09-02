import { Platform } from "react-native";

import {
  ExpoFileSystemUiIrStorage,
  loadUiIrArtifactFonts,
  PersistentUiIrArtifactCache,
} from "@onborn/runtime-expo-ui-ir";
import {
  HttpUiIrArtifactDelivery,
  refreshUiIrArtifact,
  type RefreshUiIrArtifactResult,
} from "@onborn/runtime-ui-ir/artifact";

import { ExpoCryptoUiIrArtifactCrypto } from "./expo-crypto-ui-ir-artifact-crypto";

import { resolveOnbornRuntimeConfig } from "../config/Onborn";
import { allHostCapabilityNames } from "./host-capabilities";
import {
  ONBORN_BUILDER_V2_API_BASE_URL,
  resolveBuilderV2Environment,
  resolveBuilderV2Target,
} from "./runtime-environment";
import { createBuilderV2RuntimeId } from "./runtime-id";
import { createBuilderV2HostManifest } from "./runtime-manifest";
import { BUILDER_V2_TRUSTED_UI_IR_KEYS } from "./trusted-ui-ir-keys";

export type PrefetchOnbornFlowResult =
  | {
      status: "warmed";
      /** Where the bytes came from: "cache-current" means it was warm already. */
      source: RefreshUiIrArtifactResult["source"];
    }
  | { status: "skipped"; reason: string };

/**
 * Warms the flow's cache before anyone opens it.
 *
 * `OnbornFlow` downloads, verifies and stages the published artifact on
 * mount — on a cold cache that is the wait a person sees before the first
 * screen. Calling this at app start moves that work to the splash screen:
 * by the time the flow mounts, the refresh finds the release already staged
 * (and its fonts registered) and the critical path is one HTTP round trip.
 *
 * Fire-and-forget by design: it never throws, and it deliberately claims
 * every host capability for the compatibility gate — a warmed cache the
 * mount later rejects is harmless, an unwarmed one is the wait this exists
 * to remove. Uses the same identity as the flow (userId, country,
 * appVersion), so an experiment assigns the same variant it will serve.
 *
 *     void Onborn.initAsync({ apiKey }).then(() =>
 *       prefetchOnbornFlow({ flowId: "..." }),
 *     );
 */
export async function prefetchOnbornFlow(input: {
  flowId: string;
}): Promise<PrefetchOnbornFlowResult> {
  try {
    const config = resolveOnbornRuntimeConfig();
    const target = resolveBuilderV2Target(Platform.OS);
    const environment = resolveBuilderV2Environment(config.apiKey);
    const storage = new ExpoFileSystemUiIrStorage();
    const cache = new PersistentUiIrArtifactCache({
      storage,
      createId: () => createBuilderV2RuntimeId("artifact"),
    });
    const crypto = new ExpoCryptoUiIrArtifactCrypto(BUILDER_V2_TRUSTED_UI_IR_KEYS);
    const delivery = new HttpUiIrArtifactDelivery({
      apiBaseUrl: ONBORN_BUILDER_V2_API_BASE_URL,
      apiKey: config.apiKey,
      fetchImpl: config.fetchImpl,
      ...(config.userId ? { userId: config.userId } : {}),
      ...(config.country ? { country: config.country } : {}),
      ...(config.appVersion ? { appVersion: config.appVersion } : {}),
      sessionId: createBuilderV2RuntimeId("prefetch"),
    });
    const refreshed = await refreshUiIrArtifact(
      {
        flowId: input.flowId,
        environment,
        host: createBuilderV2HostManifest(target, {
          hostCapabilities: allHostCapabilityNames(),
        }),
      },
      { cache, crypto, delivery },
    );
    // Fonts persist in expo-font's registry, so warming them here means the
    // mounted flow never waits on them either. Best-effort, like the rest.
    await loadUiIrArtifactFonts(refreshed.artifact).catch(() => undefined);
    return { status: "warmed", source: refreshed.source };
  } catch (error) {
    return {
      status: "skipped",
      reason: error instanceof Error ? error.message : "prefetch failed",
    };
  }
}
