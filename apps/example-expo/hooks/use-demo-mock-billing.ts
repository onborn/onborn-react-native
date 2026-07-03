import { createMockBillingAdapter, type OnbornBillingAdapter } from "@onborn/rn-sdk";
import { Platform } from "react-native";
import { useMemo } from "react";

export type DemoMockBillingState = {
  billingAdapter: OnbornBillingAdapter;
  ready: true;
  message: string;
};

export function useDemoMockBilling(): DemoMockBillingState {
  const billingAdapter = useMemo(
    () =>
      createMockBillingAdapter({
        transactionIdPrefix: "demo-mock",
        purchaseDelayMs: 400,
      }),
    [],
  );

  const platformLabel =
    Platform.OS === "web"
      ? "Web"
      : Platform.OS === "android"
        ? "Android"
        : "iOS";

  return {
    billingAdapter,
    ready: true,
    message: `Mock billing (${platformLabel}) — purchases validate via ONBORN test API, no RevenueCat.`,
  };
}

export function resolveDemoPlatform(): "ios" | "android" {
  return Platform.OS === "android" ? "android" : "ios";
}
