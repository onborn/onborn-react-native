import { SubscriptionFlow, type NativeCustomStepRenderers } from "@onborn/rn-sdk";
import Constants from "expo-constants";
import { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { DemoInitialLoading } from "@/components/demo-initial-loading";
import { DemoNativeCustomStep } from "@/components/demo-native-custom-step";
import {
  DemoPaymentStateScreen,
  type DemoPaymentState,
} from "@/components/demo-payment-state-screen";
import { createDemoBillingCallbacks } from "@/lib/demo-billing-callbacks";
import { demoOnbornFetch } from "@/lib/onborn-demo-runtime";
import {
  resolveDemoPlatform,
  useDemoMockBilling,
} from "@/hooks/use-demo-mock-billing";

const DEMO_SDK_API_KEY = process.env.EXPO_PUBLIC_ONBORN_SDK_API_KEY ?? "rubbish";
const DEMO_FLOW_ID = process.env.EXPO_PUBLIC_ONBORN_FLOW_ID ?? "fitness_main";
const DEMO_LOCALE = "pl";
const DEMO_APP_VERSION = "1.0.0";
const customStepRenderers: NativeCustomStepRenderers = {
  "demo-native-profile": DemoNativeCustomStep,
  "custom-screen": DemoNativeCustomStep,
};

export default function HomeScreen() {
  const paywallShownRef = useRef(false);
  const [paymentState, setPaymentState] = useState<DemoPaymentState | null>(
    null,
  );
  const [flowRunId, setFlowRunId] = useState(0);
  const platform = resolveDemoPlatform();
  const deviceUserId = useMemo(() => {
    const rawDeviceName = Constants.deviceName ?? "unknown-device";
    const normalizedDeviceName = rawDeviceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    return `device-${platform}-${normalizedDeviceName}`;
  }, [platform]);

  const billing = useDemoMockBilling();
  const billingCallbacks = useMemo(
    () =>
      createDemoBillingCallbacks({
        setPaymentState,
      }),
    [],
  );
  const resetDemo = useCallback(() => {
    paywallShownRef.current = false;
    setPaymentState(null);
    setFlowRunId((value) => value + 1);
  }, []);

  if (paymentState) {
    return <DemoPaymentStateScreen state={paymentState} onReset={resetDemo} />;
  }

  return (
    <View style={styles.container}>
      <SubscriptionFlow
        key={flowRunId}
        flowId={DEMO_FLOW_ID}
        apiKey={DEMO_SDK_API_KEY}
        userId={deviceUserId}
        locale={DEMO_LOCALE}
        platform={platform}
        appVersion={DEMO_APP_VERSION}
        fetchImpl={demoOnbornFetch}
        fallbackTemplate="fitness"
        InitialLoadingComponent={DemoInitialLoading}
        billingAdapter={billing.billingAdapter}
        customStepRenderers={customStepRenderers}
        onCustomStepMissing={({ rendererKey }) => {
          console.warn(`Missing ONBORN native custom renderer: ${rendererKey}`);
        }}
        onPaywallShown={() => {
          paywallShownRef.current = true;
        }}
        onFlowCompleted={() => {
          if (!paywallShownRef.current) {
            return;
          }
          setPaymentState((current) =>
            current ?? {
              type: "neutral",
              message: "User closed or completed the paywall without payment.",
            },
          );
        }}
        {...billingCallbacks}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
});
