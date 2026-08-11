import {
  isUserCancelledError,
  type OnbornPurchaseResult,
  type OnbornRestoreResult,
  type UseOnbornOfferingState,
} from "@onborn/billing";
import type {
  ExpoUiIrBillingPort,
  ExpoUiIrPurchaseResult,
  ExpoUiIrRestoreResult,
} from "@onborn/runtime-expo-ui-ir";

type OfferingActions = Pick<
  UseOnbornOfferingState,
  "purchasePackage" | "restorePurchases"
>;

export function createBuilderV2BillingPort(
  readOffering: () => OfferingActions,
): ExpoUiIrBillingPort {
  return {
    async purchase({ packageId }) {
      try {
        return mapPurchaseResult(
          await readOffering().purchasePackage(packageId),
        );
      } catch (error) {
        if (isUserCancelledError(error)) return { status: "cancelled" };
        throw error;
      }
    },
    async restore() {
      return mapRestoreResult(await readOffering().restorePurchases());
    },
  };
}

export function mapPurchaseResult(
  result: OnbornPurchaseResult,
): ExpoUiIrPurchaseResult {
  if (result.success && result.status === "validated" && result.productId) {
    return { status: "completed", productId: result.productId };
  }
  if (result.status === "pending") {
    return {
      status: "pending",
      ...(result.productId ? { productId: result.productId } : {}),
    };
  }
  throw new Error("Onborn could not validate the native purchase.");
}

export function mapRestoreResult(
  result: OnbornRestoreResult,
): ExpoUiIrRestoreResult {
  if (!result.success || result.status !== "validated") {
    throw new Error("Onborn could not validate restored purchases.");
  }
  const entitlementKeys = (result.entitlements ?? [])
    .filter((entitlement) => entitlement.active)
    .map((entitlement) => entitlement.key);
  return entitlementKeys.length > 0
    ? { status: "completed", entitlementKeys }
    : { status: "empty" };
}
