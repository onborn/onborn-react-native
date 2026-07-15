import {
  type CustomerEntitlement,
  type GetOfferingResponse,
} from "@onborn/sdk-contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createBillingClient } from "./client";
import { useOnbornBillingConfig } from "./runtime";
import {
  findPackageWithProduct,
  getPackagesWithProducts,
  resolveDefaultPackageId,
} from "./utils";
import { validateBillingPurchase, validateBillingRestore } from "./validation";
import type {
  OnbornBillingAdapter,
  OnbornPackageWithProduct,
  OnbornPurchaseResult,
  OnbornRestoreResult,
} from "./types";

export type UseOnbornOfferingOptions = {
  initialPackageId?: string;
  billingAdapter?: OnbornBillingAdapter;
  onPurchaseStarted?: (item: OnbornPackageWithProduct) => void;
  onPurchaseCompleted?: (result: OnbornPurchaseResult) => void;
  onPurchaseFailed?: (error: Error) => void;
  onRestoreCompleted?: (result: OnbornRestoreResult) => void;
  onRestoreFailed?: (error: Error) => void;
  onEntitlementsChanged?: (entitlements: CustomerEntitlement[]) => void;
};

export type UseOnbornOfferingState = {
  data: GetOfferingResponse | null;
  packages: OnbornPackageWithProduct[];
  selectedPackage: OnbornPackageWithProduct | null;
  selectedPackageId: string | null;
  loading: boolean;
  purchasing: boolean;
  restoring: boolean;
  error: string | null;
  selectPackage: (packageId: string) => void;
  reload: () => Promise<void>;
  purchasePackage: (packageId?: string) => Promise<OnbornPurchaseResult>;
  restorePurchases: () => Promise<OnbornRestoreResult>;
  refetchCustomerEntitlements: () => Promise<OnbornRestoreResult>;
};

export function useOnbornOffering(
  options: UseOnbornOfferingOptions = {},
): UseOnbornOfferingState {
  const runtimeOptions = useOnbornBillingConfig(options);
  const [data, setData] = useState<GetOfferingResponse | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    runtimeOptions.initialPackageId ?? null,
  );
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(
    () =>
      createBillingClient({
        sourceId: "offering:current",
      }),
    [
      runtimeOptions.apiKey,
      runtimeOptions.appId,
      runtimeOptions.appVersion,
      runtimeOptions.autoFlushMs,
      runtimeOptions.country,
      runtimeOptions.emitAnalyticsEvents,
      runtimeOptions.emitSdkConnectionSignal,
      runtimeOptions.fetchImpl,
      runtimeOptions.locale,
      runtimeOptions.platform,
      runtimeOptions.sdkVersion,
      runtimeOptions.userId,
      runtimeOptions.userType,
    ],
  );

  const packages = useMemo(
    () =>
      getPackagesWithProducts(
        data?.offering,
        data?.products,
        runtimeOptions.platform,
      ),
    [data?.offering, data?.products, runtimeOptions.platform],
  );

  const selectedPackage = useMemo(() => {
    const fallbackPackageId =
      selectedPackageId ?? resolveDefaultPackageId(data?.offering);
    return findPackageWithProduct(packages, fallbackPackageId) ?? null;
  }, [data?.offering, packages, selectedPackageId]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.loadOffering();
      const products = await loadLocalizedProducts(
        runtimeOptions.billingAdapter,
        {
          offering: response.offering,
          products: response.products,
          userId: runtimeOptions.userId,
        },
      );
      setData({ ...response, products });
      setSelectedPackageId((current) => {
        if (
          current &&
          response.offering.packages.some((item) => item.id === current)
        ) {
          return current;
        }
        return resolveDefaultPackageId(response.offering) ?? null;
      });
    } catch (loadError) {
      setError(toErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [
    client,
    runtimeOptions.billingAdapter,
    runtimeOptions.userId,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectPackage = useCallback((packageId: string) => {
    setSelectedPackageId(packageId);
  }, []);

  const purchasePackage = useCallback(
    async (packageId?: string): Promise<OnbornPurchaseResult> => {
      const item =
        findPackageWithProduct(packages, packageId) ?? selectedPackage;
      if (!item || !data?.offering) {
        throw new Error("No offering package selected");
      }
      if (!runtimeOptions.billingAdapter) {
        throw new Error(
          "Missing ONBORN billingAdapter. Provide one to purchase from a custom paywall.",
        );
      }

      setPurchasing(true);
      runtimeOptions.onPurchaseStarted?.(item);
      try {
        const adapterResult =
          await runtimeOptions.billingAdapter.purchasePackage({
            offering: data.offering,
            package: item.package,
            product: item.product,
            userId: runtimeOptions.userId,
          });
        const result = adapterResult.success
          ? await validateBillingPurchase({
              client,
              offering: data.offering,
              item,
              result: adapterResult,
            })
          : adapterResult;
        runtimeOptions.onPurchaseCompleted?.(result);
        notifyEntitlementsChanged(
          result.entitlements,
          runtimeOptions.onEntitlementsChanged,
        );
        return result;
      } catch (purchaseError) {
        const errorObject = toError(purchaseError);
        runtimeOptions.onPurchaseFailed?.(errorObject);
        throw errorObject;
      } finally {
        setPurchasing(false);
      }
    },
    [client, data?.offering, runtimeOptions, packages, selectedPackage],
  );

  const restorePurchases =
    useCallback(async (): Promise<OnbornRestoreResult> => {
      if (!runtimeOptions.billingAdapter?.restorePurchases) {
        throw new Error("Missing restorePurchases on ONBORN billingAdapter.");
      }

      setRestoring(true);
      try {
        const adapterResult =
          await runtimeOptions.billingAdapter.restorePurchases({
            offering: data?.offering,
            products: data?.products ?? [],
            userId: runtimeOptions.userId,
          });
        const result = await validateBillingRestore({
          client,
          offering: data?.offering,
          result: adapterResult,
        });
        runtimeOptions.onRestoreCompleted?.(result);
        notifyEntitlementsChanged(
          result.entitlements,
          runtimeOptions.onEntitlementsChanged,
        );
        return result;
      } catch (restoreError) {
        const errorObject = toError(restoreError);
        runtimeOptions.onRestoreFailed?.(errorObject);
        throw errorObject;
      } finally {
        setRestoring(false);
      }
    }, [client, data, runtimeOptions]);

  const refetchCustomerEntitlements =
    useCallback(async (): Promise<OnbornRestoreResult> => {
      if (!runtimeOptions.billingAdapter?.refetchCustomerEntitlements) {
        throw new Error(
          "Missing refetchCustomerEntitlements on ONBORN billingAdapter.",
        );
      }
      const adapterResult =
        await runtimeOptions.billingAdapter.refetchCustomerEntitlements({
          userId: runtimeOptions.userId,
        });
      const result = await validateBillingRestore({
        client,
        offering: data?.offering,
        result: adapterResult,
      });
      notifyEntitlementsChanged(
        result.entitlements,
        runtimeOptions.onEntitlementsChanged,
      );
      return result;
    }, [client, data?.offering, runtimeOptions]);

  return {
    data,
    packages,
    selectedPackage,
    selectedPackageId: selectedPackage?.package.id ?? null,
    loading,
    purchasing,
    restoring,
    error,
    selectPackage,
    reload: load,
    purchasePackage,
    restorePurchases,
    refetchCustomerEntitlements,
  };
}

function toErrorMessage(error: unknown): string {
  return toError(error).message;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Unknown error");
}

async function loadLocalizedProducts(
  billingAdapter: OnbornBillingAdapter | undefined,
  input: Parameters<NonNullable<OnbornBillingAdapter["loadProducts"]>>[0],
) {
  if (!billingAdapter?.loadProducts) {
    return input.products;
  }
  try {
    return await billingAdapter.loadProducts(input);
  } catch {
    return input.products;
  }
}

function notifyEntitlementsChanged(
  entitlements: CustomerEntitlement[] | undefined,
  callback: ((entitlements: CustomerEntitlement[]) => void) | undefined,
): void {
  if (!entitlements) {
    return;
  }
  callback?.(entitlements);
}
