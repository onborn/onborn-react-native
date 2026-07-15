import type {
  OnbornBillingAdapter,
  OnbornPurchaseInput,
  OnbornPurchaseResult,
  OnbornRestoreInput,
  OnbornRestoreResult,
} from "../types";

export type MockBillingAdapterOptions = {
  /** Prefix for synthetic transaction IDs sent to ONBORN validate. */
  transactionIdPrefix?: string;
  /** Optional delay to mimic store latency in dev. */
  purchaseDelayMs?: number;
  restoreDelayMs?: number;
};

/**
 * Dev-only billing adapter: simulates successful store purchase/restore without
 * RevenueCat or native IAP. Pair with ONBORN `test` environment for end-to-end
 * paywall → validate → entitlement flow.
 */
export function createMockBillingAdapter(
  options: MockBillingAdapterOptions = {},
): OnbornBillingAdapter {
  const transactionIdPrefix = options.transactionIdPrefix ?? "mock";

  return {
    async purchasePackage(
      input: OnbornPurchaseInput,
    ): Promise<OnbornPurchaseResult> {
      await delay(options.purchaseDelayMs);
      const storeProductId =
        input.product?.storeProductId ?? input.package.productId;
      if (!storeProductId) {
        throw new Error(
          `Missing storeProductId for ONBORN package '${input.package.id}'.`,
        );
      }

      const transactionId = `${transactionIdPrefix}-${Date.now()}-${input.package.id}`;
      return {
        success: true,
        packageId: input.package.id,
        productId: storeProductId,
        transactionId,
        receipt: JSON.stringify({
          mock: true,
          userId: input.userId,
          offeringId: input.offering.id,
          packageId: input.package.id,
          storeProductId,
          transactionId,
        }),
        raw: {
          mock: true,
          mode: "purchase",
        },
      };
    },

    async restorePurchases(
      input: OnbornRestoreInput,
    ): Promise<OnbornRestoreResult> {
      await delay(options.restoreDelayMs);
      const activeProductIds = input.products
        .map((product) => product.storeProductId)
        .filter((id): id is string => Boolean(id?.trim()));
      const purchases = input.products
        .filter(
          (product) =>
            (product.store === "app_store" ||
              product.store === "google_play") &&
            Boolean(product.storeProductId?.trim()),
        )
        .map((product) => {
          const storeProductId = product.storeProductId ?? product.id;
          return {
            store: product.store as "app_store" | "google_play",
            storeProductId,
            transactionId: `${transactionIdPrefix}-restore-${Date.now()}-${product.id}`,
            raw: {
              mock: true,
              mode: "restore_purchase",
              productId: product.id,
            },
          };
        });

      return {
        success: true,
        activeProductIds,
        entitlementIds: [],
        purchases,
        raw: {
          mock: true,
          mode: "restore",
          userId: input.userId,
        },
      };
    },

    async refetchCustomerEntitlements(input: {
      userId?: string;
    }): Promise<OnbornRestoreResult> {
      return {
        success: true,
        raw: {
          mock: true,
          mode: "refetch",
          userId: input.userId,
        },
      };
    },
  };
}

function delay(ms: number | undefined): Promise<void> {
  if (!ms || ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
