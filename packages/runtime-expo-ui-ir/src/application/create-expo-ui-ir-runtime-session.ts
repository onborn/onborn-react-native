import {
  createUiIrAnswerStore,
  createUiIrJourneyController,
  type UiIrActionRuntimePorts,
  type UiIrAnswerStore,
  type UiIrJourneyController,
  type UiIrJourneyEvent,
  type UiIrRendererPorts,
} from "@onborn/runtime-ui-ir/actions";
import type { UiIrIconRegistryPort } from "@onborn/runtime-ui-ir";
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
  /** Where the rendered screen publishes its selections for analytics. */
  answers: UiIrAnswerStore;
  actionPorts: Omit<UiIrActionRuntimePorts, "journey">;
  rendererPorts: Omit<UiIrRendererPorts, "handleAction">;
};

export type ExpoUiIrRuntimeSessionInput = {
  flowId: string;
  environment: "test" | "prod";
  host: BuilderV2UiIrHostManifest;
  initialScreenId?: string;
  /**
   * Present one standalone paywall instead of the journey.
   *
   * The app asked for a paywall by name, so the session holds that screen and
   * nothing else: the same artifact, the same bindings, the same analytics, but
   * no steps to walk and no progress to report.
   */
  placement?: string;
};

export type ExpoUiIrAnalyticsSessionContext = {
  input: ExpoUiIrRuntimeSessionInput;
  artifact: CachedUiIrArtifact;
  document: BuilderV2UiIrDocument;
  source: RefreshUiIrArtifactResult["source"];
  failureCode?: RefreshUiIrArtifactResult["failureCode"];
  /**
   * The experiment assignment the delivery named, for the analytics bridge
   * to stamp on every event — the stamp is what joins this session's events
   * to the variant it was served.
   */
  experiment?: RefreshUiIrArtifactResult["experiment"];
};

export type ExpoUiIrAnalyticsFactory = (
  context: ExpoUiIrAnalyticsSessionContext,
) => ExpoUiIrAnalyticsPort;

export type ExpoUiIrRuntimeSessionDependencies = {
  analytics?: ExpoUiIrAnalyticsPort;
  createAnalytics?: ExpoUiIrAnalyticsFactory;
  billing?: ExpoUiIrBillingPort;
  cache: UiIrArtifactCachePort;
  /**
   * The icons the rendered artifact may summon by name. Injected rather than
   * imported: the full Phosphor registry drags react-native's untranspiled
   * source into any Node process that touches this module, and which registry
   * a host carries is the host's decision anyway — the SDK wires the complete
   * set, a test wires none.
   */
  icons?: UiIrIconRegistryPort;
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
      ...(refreshed.experiment ? { experiment: refreshed.experiment } : {}),
    });
  const answers = createUiIrAnswerStore();
  const controller = createUiIrJourneyController({
    document,
    // This session is the app; web-only screens do not exist on this channel.
    channel: "app",
    readAnswers: (screenId) => answers.read(screenId),
    ...(input.placement ? { placement: input.placement } : {}),
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
    answers,
    actionPorts: createExpoUiIrActionPorts({
      analytics,
      billing: dependencies.billing,
      capabilities: dependencies.capabilities,
    }),
    rendererPorts: {
      resolveAsset: createExpoUiIrAssetResolver(refreshed.artifact),
      icons: dependencies.icons ?? {
        resolve: () => {
          throw new Error(
            "This host wired no icon registry; pass dependencies.icons (the SDK wires @onborn/runtime-ui-ir/phosphor).",
          );
        },
      },
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
      ...("answers" in event && event.answers
        ? { properties: { answers: event.answers } }
        : {}),
    }),
  ).catch(() => undefined);
}
