import { useEffect, useState, type ReactElement, type ReactNode } from "react";
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

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void createExpoUiIrRuntimeSession(props.input, props.dependencies)
      .then((session) => {
        if (cancelled) return;
        setState({ status: "ready", session });
        props.onSessionReady?.(session);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ status: "error", error: normalizeError(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, props.dependencies, props.input, props.onSessionReady]);

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
