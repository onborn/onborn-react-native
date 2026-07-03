import {
  type CustomerEntitlement,
  type GetOfferingResponse,
} from "@onborn/sdk-contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient, type ConversionFlowClientOptions } from "../core/client";
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

export type UseOnbornOfferingOptions = Pick<
  ConversionFlowClientOptions,
  | "apiKey"
  | "userId"
  | "locale"
  | "appId"
  | "platform"
  | "country"
  | "appVersion"
  | "userType"
  | "sdkVersion"
  | "fetchImpl"
  | "emitAnalyticsEvents"
  | "emitSdkConnectionSignal"
  | "autoFlushMs"
> & {
  offeringId: string;
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
  options: UseOnbornOfferingOptions,
): UseOnbornOfferingState {
  const [data, setData] = useState<GetOfferingResponse | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    options.initialPackageId ?? null,
  );
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(
    () =>
      createClient({
        apiKey: options.apiKey,
        flowId: `offering:${options.offeringId}`,
        userId: options.userId,
        locale: options.locale,
        appId: options.appId,
        platform: options.platform,
        country: options.country,
        appVersion: options.appVersion,
        userType: options.userType,
        sdkVersion: options.sdkVersion,
        fetchImpl: options.fetchImpl,
        emitAnalyticsEvents: options.emitAnalyticsEvents,
        emitSdkConnectionSignal: options.emitSdkConnectionSignal ?? false,
        autoFlushMs: options.autoFlushMs,
      }),
    [
      options.apiKey,
      options.appId,
      options.appVersion,
      options.autoFlushMs,
      options.country,
      options.emitAnalyticsEvents,
      options.emitSdkConnectionSignal,
      options.fetchImpl,
      options.locale,
      options.offeringId,
      options.platform,
      options.sdkVersion,
      options.userId,
      options.userType,
    ],
  );

  const packages = useMemo(
    () =>
      getPackagesWithProducts(data?.offering, data?.products, options.platform),
    [data?.offering, data?.products, options.platform],
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
      const response = await client.loadOffering(options.offeringId);
      const products = await loadLocalizedProducts(options.billingAdapter, {
        offering: response.offering,
        products: response.products,
        userId: options.userId,
      });
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
  }, [client, options.billingAdapter, options.offeringId, options.userId]);

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
      if (!options.billingAdapter) {
        throw new Error(
          "Missing ONBORN billingAdapter. Provide one to purchase from a custom paywall.",
        );
      }

      setPurchasing(true);
      options.onPurchaseStarted?.(item);
      try {
        const adapterResult = await options.billingAdapter.purchasePackage({
          offering: data.offering,
          package: item.package,
          product: item.product,
          userId: options.userId,
        });
        const result = adapterResult.success
          ? await validateBillingPurchase({
              client,
              offering: data.offering,
              item,
              result: adapterResult,
              userId: options.userId,
            })
          : adapterResult;
        options.onPurchaseCompleted?.(result);
        notifyEntitlementsChanged(
          result.entitlements,
          options.onEntitlementsChanged,
        );
        return result;
      } catch (purchaseError) {
        const errorObject = toError(purchaseError);
        options.onPurchaseFailed?.(errorObject);
        throw errorObject;
      } finally {
        setPurchasing(false);
      }
    },
    [client, data?.offering, options, packages, selectedPackage],
  );

  const restorePurchases =
    useCallback(async (): Promise<OnbornRestoreResult> => {
      if (!options.billingAdapter?.restorePurchases) {
        throw new Error("Missing restorePurchases on ONBORN billingAdapter.");
      }

      setRestoring(true);
      try {
        const adapterResult = await options.billingAdapter.restorePurchases({
          offering: data?.offering,
          products: data?.products ?? [],
          userId: options.userId,
        });
        const result = await validateBillingRestore({
          client,
          offering: data?.offering,
          result: adapterResult,
          userId: options.userId,
        });
        options.onRestoreCompleted?.(result);
        notifyEntitlementsChanged(
          result.entitlements,
          options.onEntitlementsChanged,
        );
        return result;
      } catch (restoreError) {
        const errorObject = toError(restoreError);
        options.onRestoreFailed?.(errorObject);
        throw errorObject;
      } finally {
        setRestoring(false);
      }
    }, [client, data, options]);

  const refetchCustomerEntitlements =
    useCallback(async (): Promise<OnbornRestoreResult> => {
      if (!options.billingAdapter?.refetchCustomerEntitlements) {
        throw new Error(
          "Missing refetchCustomerEntitlements on ONBORN billingAdapter.",
        );
      }
      const adapterResult =
        await options.billingAdapter.refetchCustomerEntitlements({
          userId: options.userId,
        });
      const result = await validateBillingRestore({
        client,
        offering: data?.offering,
        result: adapterResult,
        userId: options.userId,
      });
      notifyEntitlementsChanged(
        result.entitlements,
        options.onEntitlementsChanged,
      );
      return result;
    }, [client, data?.offering, options]);

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
