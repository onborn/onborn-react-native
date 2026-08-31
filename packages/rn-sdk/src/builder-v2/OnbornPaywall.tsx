import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import type { CustomerEntitlement } from "@onborn/sdk-contracts";

import { resolveOnbornRuntimeConfig } from "../config/Onborn";
import type { OnbornHostCapabilities } from "./host-capabilities";
import { OnbornUiIrPresentation } from "./OnbornFlow";
import {
  resolveBuilderV2PaywallPlacement,
  type ResolvedBuilderV2PaywallPlacement,
} from "./paywall-placement";
import { ONBORN_BUILDER_V2_API_BASE_URL } from "./runtime-environment";

export type OnbornPaywallProps = {
  /**
   * The name the app knows this paywall by — "settings-upsell", "winback".
   *
   * Not a flow id and not a screen id: the app should be able to say where it
   * wants a paywall without knowing which flow currently holds one, so the
   * paywall can be moved or replaced without an app release.
   */
  placement: string;
  locale?: string;
  /** The person bought something, or the screen finished on its own terms. */
  onComplete?: () => void;
  /** The person closed it. A standalone paywall must always allow this. */
  onDismiss?: () => void;
  onEntitlementsChanged?: (entitlements: CustomerEntitlement[]) => void;
  renderLoading?: () => ReactNode;
  renderError?: (error: Error, retry: () => void) => ReactNode;
  capabilities?: OnbornHostCapabilities;
};

type PlacementState =
  | { status: "loading" }
  | { status: "ready"; resolved: ResolvedBuilderV2PaywallPlacement }
  | { status: "error"; error: Error };

/**
 * A paywall the app presents wherever it decides.
 *
 * The journey a person walks once is `OnbornFlow`; this is everything else — a
 * locked feature, a settings upsell, a win-back after a cancellation. It ships
 * in the same release as the flow it was designed beside, which is why it looks
 * like it belongs, and it sells whichever offering it names, which is why a
 * win-back can be discounted without touching what onboarding charges.
 */
export function OnbornPaywall(props: OnbornPaywallProps): ReactNode {
  const config = resolveOnbornRuntimeConfig();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PlacementState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    void resolveBuilderV2PaywallPlacement({
      apiBaseUrl: ONBORN_BUILDER_V2_API_BASE_URL,
      apiKey: config.apiKey,
      placement: props.placement,
      ...(config.fetchImpl ? { fetchImpl: config.fetchImpl } : {}),
      signal: controller.signal,
    })
      .then((resolved) => {
        if (controller.signal.aborted) return;
        setState({ status: "ready", resolved });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", error: normalizeError(error) });
      });
    return () => controller.abort();
  }, [attempt, config.apiKey, config.fetchImpl, props.placement]);

  if (state.status === "loading") {
    return (
      <>
        {props.renderLoading?.() ?? (
          <View style={styles.centered}>
            <ActivityIndicator />
          </View>
        )}
      </>
    );
  }
  if (state.status === "error") {
    const retry = (): void => setAttempt((value) => value + 1);
    return (
      <>
        {props.renderError?.(state.error, retry) ?? (
          <View style={styles.centered}>
            <Text accessibilityRole="alert">{state.error.message}</Text>
          </View>
        )}
      </>
    );
  }

  return (
    <OnbornUiIrPresentation
      flowId={state.resolved.flowId}
      placement={props.placement}
      {...(props.locale ? { locale: props.locale } : {})}
      {...(props.onComplete ? { onComplete: props.onComplete } : {})}
      {...(props.onDismiss ? { onDismiss: props.onDismiss } : {})}
      {...(props.onEntitlementsChanged
        ? { onEntitlementsChanged: props.onEntitlementsChanged }
        : {})}
      {...(props.renderLoading ? { renderLoading: props.renderLoading } : {})}
      {...(props.renderError ? { renderError: props.renderError } : {})}
      {...(props.capabilities ? { capabilities: props.capabilities } : {})}
    />
  );
}

function normalizeError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("Onborn could not load this paywall.");
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
});
