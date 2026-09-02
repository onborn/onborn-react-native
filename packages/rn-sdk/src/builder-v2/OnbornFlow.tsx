import {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import {
  SafeAreaInsetsContext,
  SafeAreaProvider,
} from "react-native-safe-area-context";

import {
  createBuilderV2UiIrAnalyticsBridge,
  Onborn as AnalyticsOnborn,
} from "@onborn/analytics";
import {
  useOnbornOffering,
  type UseOnbornOfferingState,
} from "@onborn/billing";
import { useExpoIapBillingAdapter } from "@onborn/billing/expo-iap";
import {
  ExpoFileSystemUiIrStorage,
  ExpoUiIrRemoteFlow,
  PersistentUiIrArtifactCache,
  type ExpoUiIrAnalyticsFactory,
  type ExpoUiIrRuntimeSession,
  type ExpoUiIrRuntimeSessionDependencies,
} from "@onborn/runtime-expo-ui-ir";
import {
  CachedUiIrRuntimeControl,
  HttpUiIrArtifactDelivery,
  HttpUiIrRuntimeControl,
  HttpUiIrRuntimeDiagnostics,
} from "@onborn/runtime-ui-ir/artifact";
import type { CustomerEntitlement } from "@onborn/sdk-contracts";

import { resolveOnbornRuntimeConfig } from "../config/Onborn";
import { createBuilderV2BillingPort } from "./billing-port";
import { ExpoCryptoUiIrArtifactCrypto } from "./expo-crypto-ui-ir-artifact-crypto";
import { createBuilderV2PlanSnapshot } from "./plan-snapshot";
import {
  createOnbornCapabilityPort,
  hostCapabilityNames,
  type OnbornHostCapabilities,
} from "./host-capabilities";
import { OnbornLottie } from "./OnbornLottie";
import { OnbornVideo } from "./OnbornVideo";
import type { BuilderV2HostCapability } from "./runtime-manifest";
import { readUiIrOfferingKey } from "@onborn/runtime-ui-ir";
import {
  ONBORN_BUILDER_V2_API_BASE_URL,
  resolveBuilderV2Environment,
  resolveBuilderV2Target,
} from "./runtime-environment";
import { createBuilderV2HostManifest } from "./runtime-manifest";
import { createBuilderV2RuntimeId } from "./runtime-id";
import { BUILDER_V2_TRUSTED_UI_IR_KEYS } from "./trusted-ui-ir-keys";
import { phosphorUiIrIconRegistry } from "@onborn/runtime-ui-ir/phosphor";
import type { ExpoUiIrJourneyHostEvent } from "@onborn/runtime-expo-ui-ir";

export type OnbornFlowProps = {
  flowId: string;
  initialScreenId?: string;
  locale?: string;
  onComplete?: () => void;
  onDismiss?: () => void;
  onEntitlementsChanged?: (entitlements: CustomerEntitlement[]) => void;
  /**
   * The journey as it happens: every screen viewed, completed or returned
   * to, the journey finishing, and every custom event a screen tracks — each
   * with what has been answered so far. Fetch what a step needs when it is
   * viewed, save the profile when the journey completes, react to a button.
   */
  onEvent?: (event: OnbornFlowEvent) => void;
  renderLoading?: () => ReactNode;
  renderError?: (error: Error, retry: () => void) => ReactNode;
  /**
   * Native capabilities this app lends to the flow.
   *
   * Notifications and the rest need a config plugin and permission strings that
   * belong to the app, so the SDK carries the app's implementation rather than
   * providing one — and the host manifest promises a capability only when it
   * actually arrived here.
   */
  capabilities?: OnbornHostCapabilities;
};

export function OnbornFlow(props: OnbornFlowProps): ReactNode {
  return <OnbornUiIrPresentation {...props} />;
}

/**
 * One artifact, rendered either as the journey or as a single paywall.
 *
 * Everything below the flow id is the same for both: the same delivery, cache,
 * crypto, analytics bridge, billing port and host manifest. Only what the
 * session presents differs, so a standalone paywall is this component with a
 * placement rather than a second copy of the wiring — which is the only way the
 * two can be trusted to behave the same on a device.
 */
export type OnbornUiIrPresentationProps = OnbornFlowProps & {
  /** Present this standalone paywall instead of walking the journey. */
  placement?: string;
};

export function OnbornUiIrPresentation(
  props: OnbornUiIrPresentationProps,
): ReactNode {
  const config = resolveOnbornRuntimeConfig();
  const target = resolveBuilderV2Target(Platform.OS);
  const environment = resolveBuilderV2Environment(config.apiKey);
  const callbacks = useLatestCallbacks(props);
  const nativeStore = useExpoIapBillingAdapter();
  /*
   * Which offering to load is in the artifact, which is not in hand on the
   * first render — so the flow starts on the environment's current offering
   * and switches once the document names another. The extra load only happens
   * for a flow that chose one, and prices stay blank until it settles rather
   * than briefly showing the wrong offering's.
   */
  const [offeringKey, setOfferingKey] = useState<string | undefined>(undefined);
  const offering = useOnbornOffering({
    ...(offeringKey ? { offeringKey } : {}),
    // Purchases carry the flow so revenue lands on the flow that earned it.
    flowId: props.flowId,
    billingAdapter: nativeStore.billingAdapter,
    onEntitlementsChanged: (entitlements) => {
      callbacks.current.onEntitlementsChanged?.(entitlements);
    },
  });
  const offeringRef = useRef<UseOnbornOfferingState>(offering);
  offeringRef.current = offering;

  // The offering the dashboard configured, in the shape a paywall's price
  // bindings read. Recomputed as the store localizes, so a price appears the
  // moment it is known rather than at the next mount.
  const plans = useMemo(
    () =>
      createBuilderV2PlanSnapshot({
        loading: offering.loading,
        packages: offering.packages,
      }),
    [offering.loading, offering.packages],
  );

  const hostCapabilityNamesKey = hostCapabilityNames(props.capabilities).join(
    ",",
  );
  const input = useMemo(
    () => ({
      flowId: props.flowId,
      environment,
      host: createBuilderV2HostManifest(target, {
        hostCapabilities: hostCapabilityNamesKey
          ? (hostCapabilityNamesKey.split(",") as BuilderV2HostCapability[])
          : [],
      }),
      ...(props.placement ? { placement: props.placement } : {}),
      ...(props.initialScreenId
        ? { initialScreenId: props.initialScreenId }
        : {}),
    }),
    [
      environment,
      hostCapabilityNamesKey,
      props.flowId,
      props.initialScreenId,
      props.placement,
      target,
    ],
  );
  const dependencies = useRuntimeDependencies({
    apiKey: config.apiKey,
    emitAnalyticsEvents: config.emitAnalyticsEvents !== false,
    environment,
    flowId: props.flowId,
    fetchImpl: config.fetchImpl,
    // Experiment assignment happens where the artifact is served, so the
    // request has to say who it is for. Onborn.init fills userId in, with a
    // generated one when the app passed none. Country and app version ride
    // along when the app reported them — they are what the audience gates
    // (selected countries, minimum version) hold against.
    ...(config.userId ? { userId: config.userId } : {}),
    ...(config.country ? { country: config.country } : {}),
    ...(config.appVersion ? { appVersion: config.appVersion } : {}),
    offeringRef,
    target,
    callbacks,
    capabilities: props.capabilities,
  });

  // Stable across renders: an inline callback used to hand the remote flow a
  // fresh identity every render, and identity churn during a cold load is
  // exactly what restarted the session per render.
  const handleSessionReady = useCallback(
    (session: ExpoUiIrRuntimeSession) => {
      // A standalone paywall may sell an offering of its own, so which one to
      // load depends on what is being presented, not on the document alone.
      setOfferingKey(
        readUiIrOfferingKey(
          session.document,
          props.placement ? { placement: props.placement } : undefined,
        ),
      );
    },
    [props.placement],
  );

  return (
    <EnsureSafeAreaInsets>
    <ExpoUiIrRemoteFlow
      input={input}
      dependencies={dependencies}
      locale={props.locale ?? config.locale}
      plans={plans}
      onSessionReady={handleSessionReady}
      renderLoading={props.renderLoading}
      renderError={props.renderError}
    />
    </EnsureSafeAreaInsets>
  );
}

/**
 * Guarantees the renderer can read the device's safe-area insets.
 *
 * The runtime pads plain content screens away from the notch and home
 * indicator, which needs a SafeAreaProvider somewhere above it. Expo Router
 * apps already have one — reuse it rather than nesting a second measurement
 * pass; a bare React Native host gets one from the SDK itself.
 */
function EnsureSafeAreaInsets({ children }: { children: ReactNode }) {
  const inherited = useContext(SafeAreaInsetsContext);
  if (inherited) {
    return <>{children}</>;
  }
  return <SafeAreaProvider>{children}</SafeAreaProvider>;
}

export type OnbornFlowEvent = ExpoUiIrJourneyHostEvent;

type LatestCallbacks = Pick<
  OnbornFlowProps,
  "onComplete" | "onDismiss" | "onEntitlementsChanged" | "onEvent"
>;

function useLatestCallbacks(props: LatestCallbacks) {
  const callbacks = useRef<LatestCallbacks>(props);
  callbacks.current = props;
  return callbacks;
}

function useRuntimeDependencies(input: {
  capabilities?: OnbornHostCapabilities;
  apiKey: string;
  emitAnalyticsEvents: boolean;
  environment: "test" | "prod";
  flowId: string;
  fetchImpl?: typeof fetch;
  offeringRef: MutableRefObject<UseOnbornOfferingState>;
  target: "ios" | "android";
  callbacks: MutableRefObject<LatestCallbacks>;
  userId?: string;
  country?: string;
  appVersion?: string;
}): ExpoUiIrRuntimeSessionDependencies {
  const sessionId = useRef(createBuilderV2RuntimeId("flow"));
  const storage = useMemo(() => new ExpoFileSystemUiIrStorage(), []);
  const cache = useMemo(
    () =>
      new PersistentUiIrArtifactCache({
        storage,
        createId: () => createBuilderV2RuntimeId("artifact"),
      }),
    [storage],
  );
  const crypto = useMemo(
    () => new ExpoCryptoUiIrArtifactCrypto(BUILDER_V2_TRUSTED_UI_IR_KEYS),
    [],
  );
  const delivery = useMemo(
    () =>
      new HttpUiIrArtifactDelivery({
        apiBaseUrl: ONBORN_BUILDER_V2_API_BASE_URL,
        apiKey: input.apiKey,
        fetchImpl: input.fetchImpl,
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.country ? { country: input.country } : {}),
        ...(input.appVersion ? { appVersion: input.appVersion } : {}),
        sessionId: sessionId.current,
      }),
    [input.apiKey, input.appVersion, input.country, input.fetchImpl, input.userId],
  );
  const control = useMemo(
    () =>
      new CachedUiIrRuntimeControl({
        source: new HttpUiIrRuntimeControl({
          apiBaseUrl: ONBORN_BUILDER_V2_API_BASE_URL,
          apiKey: input.apiKey,
          fetchImpl: input.fetchImpl,
        }),
      }),
    [input.apiKey, input.fetchImpl],
  );
  const diagnostics = useMemo(
    () =>
      new HttpUiIrRuntimeDiagnostics({
        apiBaseUrl: ONBORN_BUILDER_V2_API_BASE_URL,
        apiKey: input.apiKey,
        fetchImpl: input.fetchImpl,
      }),
    [input.apiKey, input.fetchImpl],
  );
  const billing = useMemo(
    () => createBuilderV2BillingPort(() => input.offeringRef.current),
    [input.offeringRef],
  );
  const createAnalytics = useMemo(
    () => createAnalyticsFactory(input, sessionId.current),
    [input.emitAnalyticsEvents, input.environment, input.flowId, input.target],
  );
  const onComplete = useCallback(
    () => input.callbacks.current.onComplete?.(),
    [input.callbacks],
  );
  const onDismiss = useCallback(
    () => input.callbacks.current.onDismiss?.(),
    [input.callbacks],
  );
  const onJourneyEvent = useCallback(
    (event: OnbornFlowEvent) => input.callbacks.current.onEvent?.(event),
    [input.callbacks],
  );

  const capabilities = useMemo(
    () =>
      createOnbornCapabilityPort(input.capabilities, {
        lottie: (props) => <OnbornLottie {...props} />,
        video: (props) => <OnbornVideo {...props} />,
      }),
    [input.capabilities],
  );

  return useMemo(
    () => ({
      cache,
      control,
      crypto,
      delivery,
      diagnostics,
      billing,
      // The complete set: the artifact names icons at runtime, and on a
      // device the registry's weight is a non-issue. See UiIrIconRegistryPort.
      icons: phosphorUiIrIconRegistry,
      ...(capabilities ? { capabilities } : {}),
      ...(createAnalytics ? { createAnalytics } : {}),
      onComplete,
      onDismiss,
      onJourneyEvent,
    }),
    [
      billing,
      cache,
      capabilities,
      control,
      createAnalytics,
      crypto,
      delivery,
      diagnostics,
      onComplete,
      onDismiss,
      onJourneyEvent,
    ],
  );
}

function createAnalyticsFactory(
  input: {
    emitAnalyticsEvents: boolean;
    environment: "test" | "prod";
    flowId: string;
    target: "ios" | "android";
  },
  sessionId: string,
): ExpoUiIrAnalyticsFactory | undefined {
  if (!input.emitAnalyticsEvents) return undefined;
  return ({ artifact, document, experiment }) =>
    createBuilderV2UiIrAnalyticsBridge({
      flowId: input.flowId,
      environment: input.environment,
      target: input.target,
      artifact: artifact.artifact,
      release: artifact.release,
      document,
      sessionId,
      // The delivery's assignment stamp: this is what joins the session's
      // events to the experiment variant it was served.
      ...(experiment ? { experiment } : {}),
      emit: async (event) => {
        await AnalyticsOnborn.emitRuntimeEvent(event);
      },
    });
}
