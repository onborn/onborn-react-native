import { Onborn, OnbornFlow } from "@onborn/rn-sdk";
import Constants from "expo-constants";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  DemoPaymentStateScreen,
  type DemoPaymentState,
} from "@/components/demo-payment-state-screen";
import { demoOnbornFetch } from "@/lib/onborn-demo-runtime";

const DEMO_SDK_API_KEY = process.env.EXPO_PUBLIC_ONBORN_SDK_API_KEY ?? "";
const DEMO_FLOW_ID = process.env.EXPO_PUBLIC_ONBORN_FLOW_ID ?? "";
const DEMO_LOCALE = "en";
const DEMO_APP_VERSION = "1.0.0";

/**
 * The whole integration: initialize once, render the flow.
 *
 * Screens, their order, and the paywall come from the published release, so
 * nothing about them appears in this file. Purchases go through expo-iap
 * inside the SDK; the app only reacts to the entitlements it is handed.
 */
export default function HomeScreen() {
  const [ready, setReady] = useState(false);
  const [paymentState, setPaymentState] = useState<DemoPaymentState | null>(
    null,
  );
  const [flowRunId, setFlowRunId] = useState(0);

  const userId = useMemo(() => {
    const rawDeviceName = Constants.deviceName ?? "unknown-device";
    return `device-${rawDeviceName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Onborn.initAsync({
      apiKey: DEMO_SDK_API_KEY,
      userId,
      locale: DEMO_LOCALE,
      appVersion: DEMO_APP_VERSION,
      fetchImpl: demoOnbornFetch,
    }).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const resetDemo = useCallback(() => {
    setPaymentState(null);
    setFlowRunId((value) => value + 1);
  }, []);

  if (paymentState) {
    return <DemoPaymentStateScreen state={paymentState} onReset={resetDemo} />;
  }

  if (!ready) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OnbornFlow
        key={flowRunId}
        flowId={DEMO_FLOW_ID}
        // Video and haptics come with the SDK; an app lends capabilities only
        // for what needs its own permissions or screens (camera, sign-in).
        onEntitlementsChanged={(entitlements) => {
          const active = entitlements.filter((entitlement) => entitlement.active);
          setPaymentState(
            active.length > 0
              ? { type: "success", entitlementCount: active.length }
              : {
                  type: "neutral",
                  message: "No active entitlement after this purchase.",
                },
          );
        }}
        onComplete={() => {
          setPaymentState((current) =>
            current ?? { type: "neutral", message: "Flow completed." },
          );
        }}
        onDismiss={() => {
          setPaymentState((current) =>
            current ?? { type: "neutral", message: "Flow dismissed." },
          );
        }}
        renderLoading={() => (
          <View style={[styles.container, styles.centered]}>
            <ActivityIndicator color="#ffffff" />
          </View>
        )}
        renderError={(error, retry) => (
          <View style={[styles.container, styles.centered]}>
            <Text style={styles.errorText}>{error.message}</Text>
            <Pressable onPress={retry} style={styles.retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  errorText: {
    color: "#ffffff",
    textAlign: "center",
  },
  retry: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  retryText: {
    color: "#000000",
    fontWeight: "600",
  },
});
