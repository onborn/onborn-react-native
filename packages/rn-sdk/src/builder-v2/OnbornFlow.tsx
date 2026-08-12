import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Platform } from "react-native";

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
  type ExpoUiIrRuntimeSessionDependencies,
} from "@onborn/runtime-expo-ui-ir";
import {
  CachedUiIrRuntimeControl,
  HttpUiIrArtifactDelivery,
  HttpUiIrRuntimeControl,
  HttpUiIrRuntimeDiagnostics,
  NobleUiIrArtifactCrypto,
} from "@onborn/runtime-ui-ir/artifact";
import type { CustomerEntitlement } from "@onborn/sdk-contracts";

import { resolveOnbornRuntimeConfig } from "../config/Onborn";
import { createBuilderV2BillingPort } from "./billing-port";
import { createBuilderV2PlanSnapshot } from "./plan-snapshot";
import { readUiIrOfferingKey } from "@onborn/runtime-ui-ir";
import {
  ONBORN_BUILDER_V2_API_BASE_URL,
  resolveBuilderV2Environment,
  resolveBuilderV2Target,
} from "./runtime-environment";
import { createBuilderV2HostManifest } from "./runtime-manifest";
import { createBuilderV2RuntimeId } from "./runtime-id";
import { BUILDER_V2_TRUSTED_UI_IR_KEYS } from "./trusted-ui-ir-keys";

export type OnbornFlowProps = {
  flowId: string;
  initialScreenId?: string;
  locale?: string;
  onComplete?: () => void;
  onDismiss?: () => void;
  onEntitlementsChanged?: (entitlements: CustomerEntitlement[]) => void;
  renderLoading?: () => ReactNode;
  renderError?: (error: Error, retry: () => void) => ReactNode;
};

export function OnbornFlow(props: OnbornFlowProps): ReactNode {
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

  const input = useMemo(
    () => ({
      flowId: props.flowId,
      environment,
      host: createBuilderV2HostManifest(target),
      ...(props.initialScreenId
        ? { initialScreenId: props.initialScreenId }
        : {}),
    }),
    [environment, props.flowId, props.initialScreenId, target],
  );
  const dependencies = useRuntimeDependencies({
    apiKey: config.apiKey,
    emitAnalyticsEvents: config.emitAnalyticsEvents !== false,
    environment,
    flowId: props.flowId,
    fetchImpl: config.fetchImpl,
    offeringRef,
    target,
    callbacks,
  });

  return (
    <ExpoUiIrRemoteFlow
      input={input}
      dependencies={dependencies}
      locale={props.locale ?? config.locale}
      plans={plans}
      onSessionReady={(session) => {
        setOfferingKey(readUiIrOfferingKey(session.document));
      }}
      renderLoading={props.renderLoading}
      renderError={props.renderError}
    />
  );
}

type LatestCallbacks = Pick<
  OnbornFlowProps,
  "onComplete" | "onDismiss" | "onEntitlementsChanged"
>;

function useLatestCallbacks(props: LatestCallbacks) {
  const callbacks = useRef<LatestCallbacks>(props);
  callbacks.current = props;
  return callbacks;
}

function useRuntimeDependencies(input: {
  apiKey: string;
  emitAnalyticsEvents: boolean;
  environment: "test" | "prod";
  flowId: string;
  fetchImpl?: typeof fetch;
  offeringRef: MutableRefObject<UseOnbornOfferingState>;
  target: "ios" | "android";
  callbacks: MutableRefObject<LatestCallbacks>;
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
    () => new NobleUiIrArtifactCrypto(BUILDER_V2_TRUSTED_UI_IR_KEYS),
    [],
  );
  const delivery = useMemo(
    () =>
      new HttpUiIrArtifactDelivery({
        apiBaseUrl: ONBORN_BUILDER_V2_API_BASE_URL,
        apiKey: input.apiKey,
        fetchImpl: input.fetchImpl,
      }),
    [input.apiKey, input.fetchImpl],
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

  return useMemo(
    () => ({
      cache,
      control,
      crypto,
      delivery,
      diagnostics,
      billing,
      ...(createAnalytics ? { createAnalytics } : {}),
      onComplete,
      onDismiss,
    }),
    [
      billing,
      cache,
      control,
      createAnalytics,
      crypto,
      delivery,
      diagnostics,
      onComplete,
      onDismiss,
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
  return ({ artifact, document }) =>
    createBuilderV2UiIrAnalyticsBridge({
      flowId: input.flowId,
      environment: input.environment,
      target: input.target,
      artifact: artifact.artifact,
      release: artifact.release,
      document,
      sessionId,
      emit: async (event) => {
        await AnalyticsOnborn.emitRuntimeEvent(event);
      },
    });
}
