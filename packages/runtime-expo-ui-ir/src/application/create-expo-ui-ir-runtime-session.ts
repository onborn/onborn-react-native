import {
  createUiIrJourneyController,
  type UiIrActionRuntimePorts,
  type UiIrJourneyController,
  type UiIrJourneyEvent,
  type UiIrRendererPorts,
} from "@onborn/runtime-ui-ir/actions";
import {
  loadCachedUiIrDocument,
  loadUiIrArtifactSession,
  type CachedUiIrArtifact,
  type RefreshUiIrArtifactResult,
  type UiIrArtifactCachePort,
  type UiIrArtifactClockPort,
  type UiIrArtifactCryptoPort,
  type UiIrArtifactDeliveryPort,
  type UiIrRuntimeControlPort,
  type UiIrRuntimeDiagnosticsPort,
} from "@onborn/runtime-ui-ir/artifact";
import type {
  BuilderV2UiIrDocument,
  BuilderV2UiIrHostManifest,
} from "@onborn/sdk-contracts";

import type {
  ExpoUiIrAnalyticsPort,
  ExpoUiIrBillingPort,
  ExpoUiIrCapabilityPort,
  ExpoUiIrNodeDecorator,
} from "../ports/expo-ui-ir-runtime";
import { createExpoUiIrActionPorts } from "./create-expo-ui-ir-action-ports";
import { createExpoUiIrAssetResolver } from "./create-expo-ui-ir-asset-resolver";
import { loadUiIrArtifactFonts } from "../infrastructure/expo-font-ui-ir-font-loader";

export type ExpoUiIrRuntimeSession = {
  artifact: CachedUiIrArtifact;
  document: BuilderV2UiIrDocument;
  source: RefreshUiIrArtifactResult["source"];
  failureCode?: RefreshUiIrArtifactResult["failureCode"];
  controller: UiIrJourneyController;
  actionPorts: Omit<UiIrActionRuntimePorts, "journey">;
  rendererPorts: Omit<UiIrRendererPorts, "handleAction">;
};

export type ExpoUiIrRuntimeSessionInput = {
  flowId: string;
  environment: "test" | "prod";
  host: BuilderV2UiIrHostManifest;
  initialScreenId?: string;
};

export type ExpoUiIrAnalyticsSessionContext = {
  input: ExpoUiIrRuntimeSessionInput;
  artifact: CachedUiIrArtifact;
  document: BuilderV2UiIrDocument;
  source: RefreshUiIrArtifactResult["source"];
  failureCode?: RefreshUiIrArtifactResult["failureCode"];
};

export type ExpoUiIrAnalyticsFactory = (
  context: ExpoUiIrAnalyticsSessionContext,
) => ExpoUiIrAnalyticsPort;

export type ExpoUiIrRuntimeSessionDependencies = {
  analytics?: ExpoUiIrAnalyticsPort;
  createAnalytics?: ExpoUiIrAnalyticsFactory;
  billing?: ExpoUiIrBillingPort;
  cache: UiIrArtifactCachePort;
  /** Overridable for tests; defaults to expo-font against staged files. */
  loadFonts?: (artifact: CachedUiIrArtifact) => Promise<void>;
  capabilities?: ExpoUiIrCapabilityPort;
  clock?: UiIrArtifactClockPort;
  crypto: UiIrArtifactCryptoPort;
  delivery: UiIrArtifactDeliveryPort;
  control?: UiIrRuntimeControlPort;
  diagnostics?: UiIrRuntimeDiagnosticsPort;
  decorateNode?: ExpoUiIrNodeDecorator;
  onComplete: () => void;
  onDismiss: () => void;
};

export async function createExpoUiIrRuntimeSession(
  input: ExpoUiIrRuntimeSessionInput,
  dependencies: ExpoUiIrRuntimeSessionDependencies,
): Promise<ExpoUiIrRuntimeSession> {
  assertNativeHost(input.host);
  assertAnalyticsConfiguration(dependencies);
  const refreshed = await loadUiIrArtifactSession(input, dependencies);
  // Typography is part of the artifact; the session is not ready until the
  // fonts it shipped are loadable by name.
  await (dependencies.loadFonts ?? loadUiIrArtifactFonts)(refreshed.artifact);
  const document = await loadCachedUiIrDocument(refreshed.artifact, {
    cache: dependencies.cache,
    crypto: dependencies.crypto,
  });
  const analytics =
    dependencies.analytics ??
    dependencies.createAnalytics?.({
      input,
      artifact: refreshed.artifact,
      document,
      source: refreshed.source,
      ...(refreshed.failureCode ? { failureCode: refreshed.failureCode } : {}),
    });
  const controller = createUiIrJourneyController({
    document,
    ...(input.initialScreenId
      ? { initialScreenId: input.initialScreenId }
      : {}),
    onComplete: dependencies.onComplete,
    onDismiss: dependencies.onDismiss,
    ...(analytics
      ? {
          onEvent: (event) => {
            trackJourney(analytics, event);
          },
        }
      : {}),
  });
  return {
    artifact: refreshed.artifact,
    document,
    source: refreshed.source,
    ...(refreshed.failureCode ? { failureCode: refreshed.failureCode } : {}),
    controller,
    actionPorts: createExpoUiIrActionPorts({
      analytics,
      billing: dependencies.billing,
      capabilities: dependencies.capabilities,
    }),
    rendererPorts: {
      resolveAsset: createExpoUiIrAssetResolver(refreshed.artifact),
      renderCapability: (renderInput) => {
        if (!dependencies.capabilities) {
          throw new Error(
            `UI IR capability "${renderInput.capability}" is unavailable.`,
          );
        }
        return dependencies.capabilities.render(renderInput);
      },
      ...(dependencies.decorateNode
        ? { decorateNode: dependencies.decorateNode }
        : {}),
    },
  };
}

function assertAnalyticsConfiguration(
  dependencies: ExpoUiIrRuntimeSessionDependencies,
): void {
  if (dependencies.analytics && dependencies.createAnalytics) {
    throw new Error(
      "Expo UI IR runtime accepts either analytics or createAnalytics, not both.",
    );
  }
}

function assertNativeHost(host: BuilderV2UiIrHostManifest): void {
  if (host.target !== "ios" && host.target !== "android") {
    throw new Error(
      `Expo UI IR runtime requires an iOS or Android host, received "${host.target}".`,
    );
  }
}

function trackJourney(
  analytics: ExpoUiIrAnalyticsPort,
  event: UiIrJourneyEvent,
): void {
  void Promise.resolve(
    analytics.track({
      event: event.type,
      screenId: event.screenId,
      ...("placement" in event && event.placement
        ? { properties: { placement: event.placement } }
        : {}),
    }),
  ).catch(() => undefined);
}
