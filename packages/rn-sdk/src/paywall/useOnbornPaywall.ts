import {
  type CustomerEntitlement,
  type GetPaywallResponse,
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

export type UseOnbornPaywallOptions = Pick<
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
  paywallId: string;
  initialPackageId?: string;
  billingAdapter?: OnbornBillingAdapter;
  onStartTrial?: (
    item: OnbornPackageWithProduct,
  ) => void | false | Promise<void | false>;
  onPurchaseStarted?: (item: OnbornPackageWithProduct) => void;
  onPurchaseCompleted?: (result: OnbornPurchaseResult) => void;
  onPurchaseFailed?: (error: Error) => void;
  onRestoreCompleted?: (result: OnbornRestoreResult) => void;
  onRestoreFailed?: (error: Error) => void;
  onEntitlementsChanged?: (entitlements: CustomerEntitlement[]) => void;
};

export type UseOnbornPaywallState = {
  data: GetPaywallResponse | null;
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
  startTrialPackage: (packageId?: string) => Promise<OnbornPurchaseResult>;
  restorePurchases: () => Promise<OnbornRestoreResult>;
  refetchCustomerEntitlements: () => Promise<OnbornRestoreResult>;
};

export function useOnbornPaywall(
  options: UseOnbornPaywallOptions,
): UseOnbornPaywallState {
  const [data, setData] = useState<GetPaywallResponse | null>(null);
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
        flowId: `paywall:${options.paywallId}`,
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
      options.paywallId,
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
      const response = await client.loadPaywall(options.paywallId);
      const products = await loadLocalizedProducts(options.billingAdapter, {
        paywall: response.paywall,
        offering: response.offering,
        products: response.products,
        userId: options.userId,
      });
      setData({ ...response, products });
      setSelectedPackageId((current) => {
        if (
          current &&
          response.offering?.packages.some((item) => item.id === current)
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
  }, [client, options.billingAdapter, options.paywallId, options.userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectPackage = useCallback(
    (packageId: string) => {
      setSelectedPackageId(packageId);
      if (!data?.paywall) {
        return;
      }
      const product = findPackageWithProduct(packages, packageId)?.product;
      void client
        .trackPaywallPackageSelected({
          sessionId: `paywall:${data.paywall.id}`,
          stepId: `paywall:${data.paywall.id}:screen`,
          paywallId: data.paywall.id,
          paywallTemplate: data.paywall.name,
          packageId,
          productId: product?.storeProductId,
        })
        .then(() => client.flushEvents())
        .catch(() => {});
    },
    [client, data, packages],
  );

  const purchasePackageInternal = useCallback(
    async (
      packageId?: string,
      intent: "purchase" | "trial" = "purchase",
    ): Promise<OnbornPurchaseResult> => {
      const item =
        findPackageWithProduct(packages, packageId) ?? selectedPackage;
      if (!item || !data?.offering) {
        throw new Error("No paywall package selected");
      }
      if (!options.billingAdapter) {
        throw new Error(
          "Missing ONBORN billingAdapter. Provide one to purchase from a custom paywall.",
        );
      }

      if (intent === "trial") {
        try {
          const shouldContinue = await options.onStartTrial?.(item);
          if (shouldContinue === false) {
            return { success: false, packageId: item.package.id };
          }
        } catch (trialError) {
          const errorObject = toError(trialError);
          options.onPurchaseFailed?.(errorObject);
          throw errorObject;
        }
      }

      setPurchasing(true);
      options.onPurchaseStarted?.(item);
      const paywallSessionId = `paywall:${data.paywall.id}`;
      const paywallStepId = `paywall:${data.paywall.id}:screen`;
      const purchaseProductId =
        item.product?.storeProductId ?? item.package.productId;
      void client
        .trackPaywallPurchaseStarted({
          sessionId: paywallSessionId,
          stepId: paywallStepId,
          paywallId: data.paywall.id,
          paywallTemplate: data.paywall.name,
          packageId: item.package.id,
          productId: purchaseProductId,
        })
        .then(() => client.flushEvents())
        .catch(() => {});
      if (intent === "trial") {
        void client
          .trackPaywallTrialStarted({
            sessionId: paywallSessionId,
            stepId: paywallStepId,
            paywallId: data.paywall.id,
            paywallTemplate: data.paywall.name,
            packageId: item.package.id,
            productId: purchaseProductId,
            trialPeriod: item.product?.trialPeriod,
          })
          .then(() => client.flushEvents())
          .catch(() => {});
      }
      try {
        const adapterResult = await options.billingAdapter.purchasePackage({
          paywall: data.paywall,
          offering: data.offering,
          package: item.package,
          product: item.product,
          userId: options.userId,
        });
        const result = adapterResult.success
          ? await validateBillingPurchase({
              client,
              paywall: data.paywall,
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
        if (result.success && result.status === "validated") {
          await client.trackPaywallConverted({
            sessionId: paywallSessionId,
            stepId: paywallStepId,
            paywallId: data.paywall.id,
            paywallTemplate: data.paywall.name,
            productId: purchaseProductId,
          });
          await client.flushEvents();
        } else if (!result.success) {
          void client
            .trackPaywallPurchaseFailed({
              sessionId: paywallSessionId,
              stepId: paywallStepId,
              paywallId: data.paywall.id,
              paywallTemplate: data.paywall.name,
              reason: "error",
              packageId: item.package.id,
              productId: purchaseProductId,
            })
            .then(() => client.flushEvents())
            .catch(() => {});
        }
        return result;
      } catch (purchaseError) {
        const errorObject = toError(purchaseError);
        options.onPurchaseFailed?.(errorObject);
        void client
          .trackPaywallPurchaseFailed({
            sessionId: paywallSessionId,
            stepId: paywallStepId,
            paywallId: data.paywall.id,
            paywallTemplate: data.paywall.name,
            reason: classifyPurchaseFailureReason(purchaseError),
            packageId: item.package.id,
            productId: purchaseProductId,
            message: errorObject.message,
          })
          .then(() => client.flushEvents())
          .catch(() => {});
        throw errorObject;
      } finally {
        setPurchasing(false);
      }
    },
    [client, data, options, packages, selectedPackage],
  );

  const purchasePackage = useCallback(
    (packageId?: string) => purchasePackageInternal(packageId, "purchase"),
    [purchasePackageInternal],
  );

  const startTrialPackage = useCallback(
    (packageId?: string) => purchasePackageInternal(packageId, "trial"),
    [purchasePackageInternal],
  );

  const restorePurchases =
    useCallback(async (): Promise<OnbornRestoreResult> => {
      if (!options.billingAdapter?.restorePurchases) {
        throw new Error("Missing restorePurchases on ONBORN billingAdapter.");
      }

      setRestoring(true);
      const restorePaywall = data?.paywall;
      if (restorePaywall) {
        void client
          .trackPaywallRestoreStarted({
            sessionId: `paywall:${restorePaywall.id}`,
            stepId: `paywall:${restorePaywall.id}:screen`,
            paywallId: restorePaywall.id,
            paywallTemplate: restorePaywall.name,
          })
          .then(() => client.flushEvents())
          .catch(() => {});
      }
      try {
        const adapterResult = await options.billingAdapter.restorePurchases({
          paywall: data?.paywall,
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
        if (restorePaywall) {
          void client
            .trackPaywallRestoreCompleted({
              sessionId: `paywall:${restorePaywall.id}`,
              stepId: `paywall:${restorePaywall.id}:screen`,
              paywallId: restorePaywall.id,
              paywallTemplate: restorePaywall.name,
              restored: Boolean(result.success),
            })
            .then(() => client.flushEvents())
            .catch(() => {});
        }
        return result;
      } catch (restoreError) {
        const errorObject = toError(restoreError);
        options.onRestoreFailed?.(errorObject);
        if (restorePaywall) {
          void client
            .trackPaywallRestoreFailed({
              sessionId: `paywall:${restorePaywall.id}`,
              stepId: `paywall:${restorePaywall.id}:screen`,
              paywallId: restorePaywall.id,
              paywallTemplate: restorePaywall.name,
              message: errorObject.message,
            })
            .then(() => client.flushEvents())
            .catch(() => {});
        }
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
    startTrialPackage,
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

function classifyPurchaseFailureReason(error: unknown): "cancelled" | "error" {
  if (error && typeof error === "object") {
    const candidate = error as {
      userCancelled?: unknown;
      code?: unknown;
      message?: unknown;
    };
    if (
      candidate.userCancelled === true ||
      candidate.userCancelled === "true"
    ) {
      return "cancelled";
    }
    const code =
      typeof candidate.code === "string" ? candidate.code.toUpperCase() : "";
    if (code.includes("CANCEL")) {
      return "cancelled";
    }
    const message =
      typeof candidate.message === "string"
        ? candidate.message.toLowerCase()
        : "";
    if (message.includes("cancel")) {
      return "cancelled";
    }
  }
  return "error";
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
