import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  createExpoUiIrRuntimeSession,
  type ExpoUiIrRuntimeSession,
  type ExpoUiIrRuntimeSessionDependencies,
  type ExpoUiIrRuntimeSessionInput,
} from "../application/create-expo-ui-ir-runtime-session";
import type { UiIrPlanSnapshot } from "@onborn/runtime-ui-ir";
import { ExpoUiIrFlow } from "./expo-ui-ir-flow";

export type ExpoUiIrRemoteFlowProps = {
  input: ExpoUiIrRuntimeSessionInput;
  dependencies: ExpoUiIrRuntimeSessionDependencies;
  locale?: string;
  renderLoading?: () => ReactNode;
  renderError?: (error: Error, retry: () => void) => ReactNode;
  onSessionReady?: (session: ExpoUiIrRuntimeSession) => void;
  /** The offering a paywall screen's price bindings read. */
  plans?: UiIrPlanSnapshot;
};

type RemoteFlowState =
  | { status: "loading" }
  | { status: "ready"; session: ExpoUiIrRuntimeSession }
  | { status: "error"; error: Error };

export function ExpoUiIrRemoteFlow(
  props: ExpoUiIrRemoteFlowProps,
): ReactElement {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<RemoteFlowState>({
    status: "loading",
  });

  /*
   * The session restarts only when WHAT to load changes — the input (flow,
   * environment, host, placement) or an explicit retry. Dependencies and the
   * ready callback ride in refs: hosts hand both in with fresh identities on
   * every render (an inline `capabilities` object, an inline callback), and
   * keying the effect on them started a brand-new session per parent render.
   * During a cold load the offering hook re-renders the host several times,
   * so one mount kicked off four full downloads racing each other — the
   * "cancelled" flag only ignores results, it does not stop the network.
   */
  const dependenciesRef = useRef(props.dependencies);
  dependenciesRef.current = props.dependencies;
  const onSessionReadyRef = useRef(props.onSessionReady);
  onSessionReadyRef.current = props.onSessionReady;

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void createExpoUiIrRuntimeSession(props.input, dependenciesRef.current)
      .then((session) => {
        if (cancelled) return;
        setState({ status: "ready", session });
        onSessionReadyRef.current?.(session);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ status: "error", error: normalizeError(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, props.input]);

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
    <ExpoUiIrFlow
      session={state.session}
      locale={props.locale}
      plans={props.plans}
    />
  );
}

function normalizeError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("Builder V2 UI could not be loaded.");
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
});
