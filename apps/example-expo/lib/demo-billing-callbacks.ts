import type { CustomerEntitlement } from "@onborn/rn-sdk";
import type {
  OnbornPackageWithProduct,
  OnbornPurchaseResult,
  OnbornRestoreResult,
} from "@onborn/rn-sdk";
import type { DemoPaymentState } from "@/components/demo-payment-state-screen";

type DemoBillingCallbackOptions = {
  setPaymentState: (state: DemoPaymentState) => void;
};

export function createDemoBillingCallbacks({
  setPaymentState,
}: DemoBillingCallbackOptions) {
  return {
    onPurchaseStarted: (item: OnbornPackageWithProduct) => {
      console.log("[demo] purchase started", {
        packageId: item.package.id,
        productId: item.product?.storeProductId ?? item.package.productId,
      });
    },
    onPurchaseCompleted: (result: OnbornPurchaseResult) => {
      console.log("[demo] purchase completed", result);
      setPaymentState(
        result.success
          ? {
              type: "success",
              status: result.status,
              entitlementCount: result.entitlements?.length ?? 0,
            }
          : {
              type: "error",
              message: `Purchase finished without success. status=${result.status ?? "unknown"}`,
            },
      );
    },
    onPurchaseFailed: (error: Error) => {
      console.warn("[demo] purchase failed", error);
      setPaymentState({ type: "error", message: error.message });
    },
    onRestoreCompleted: (result: OnbornRestoreResult) => {
      console.log("[demo] restore completed", result);
    },
    onRestoreFailed: (error: Error) => {
      console.warn("[demo] restore failed", error);
    },
    onEntitlementsChanged: (entitlements: CustomerEntitlement[]) => {
      console.log(
        "[demo] entitlements changed",
        entitlements.map((item) => item.key),
      );
    },
  };
}
