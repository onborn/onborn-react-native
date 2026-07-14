import { Onborn, SubscriptionPaywall } from "@onborn/rn-sdk";
import Constants from "expo-constants";
import { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { DemoInitialLoading } from "@/components/demo-initial-loading";
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
const DEMO_PAYWALL_ID =
  process.env.EXPO_PUBLIC_ONBORN_PAYWALL_ID ?? "demo-paywall-id";
const DEMO_LOCALE = "pl";
const DEMO_APP_VERSION = "1.0.0";

export default function PaywallScreen() {
  const paywallShownRef = useRef(false);
  const [paymentState, setPaymentState] = useState<DemoPaymentState | null>(
    null,
  );
  const [paywallRunId, setPaywallRunId] = useState(0);
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
  Onborn.init({
    apiKey: DEMO_SDK_API_KEY,
    userId: deviceUserId,
    locale: DEMO_LOCALE,
    platform,
    appVersion: DEMO_APP_VERSION,
    fetchImpl: demoOnbornFetch,
  });
  const resetDemo = useCallback(() => {
    paywallShownRef.current = false;
    setPaymentState(null);
    setPaywallRunId((value) => value + 1);
  }, []);

  if (paymentState) {
    return <DemoPaymentStateScreen state={paymentState} onReset={resetDemo} />;
  }

  return (
    <View style={styles.container}>
      <SubscriptionPaywall
        key={paywallRunId}
        paywallId={DEMO_PAYWALL_ID}
        InitialLoadingComponent={DemoInitialLoading}
        billingAdapter={billing.billingAdapter}
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
              message: "User closed the standalone paywall without payment.",
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
