import {
  fetchProducts,
  getActiveSubscriptions,
  getAvailablePurchases,
  restorePurchases as synchronizeStorePurchases,
  type ProductSubscription,
  type Purchase,
  useIAP,
} from "expo-iap";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { createNativeStoresBillingAdapter } from "./adapters/nativeStores";
import type {
  OnbornBillingAdapter,
  OnbornPurchaseResult,
  OnbornRestoreResult,
} from "./types";

const DEFAULT_PURCHASE_TIMEOUT_MS = 2 * 60 * 1000;
const DEFAULT_CONNECTION_TIMEOUT_MS = 15_000;
const DEFAULT_RECOVERY_DELAY_MS = 750;
const DEFAULT_PRODUCT_CACHE_MS = 10_000;
const DEFAULT_PRODUCT_RETRY_DELAY_MS = 500;
const DEFAULT_RESTORE_SETTLE_DELAY_MS = 300;

type PendingPurchase = {
  productId: string;
  resolve: (purchase: Purchase) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  dispatching: boolean;
  bufferedPurchase?: Purchase;
  bufferedError?: Error;
};

type ProductCache = {
  products: ProductSubscription[];
  fetchedAt: number;
};

type ConnectionWaiter = {
  resolve: () => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export type ExpoIapBillingAdapterOptions = {
  /** Additional subscription SKUs that should share the adapter product cache. */
  productIds?: string[];
  /** Maximum time an operation waits for the native store connection. */
  connectionTimeoutMs?: number;
  purchaseTimeoutMs?: number;
  purchaseRecoveryDelayMs?: number;
  productCacheMs?: number;
  productRetryCount?: number;
  productRetryDelayMs?: number;
  restoreSettleDelayMs?: number;
};

export type ExpoIapBillingAdapter = {
  /**
   * Adapter that can be passed to Onborn hooks immediately. Store
   * operations wait for the native IAP connection internally.
   */
  billingAdapter: OnbornBillingAdapter;
  /** Native store connection state for optional loading and disabled UI. */
  connected: boolean;
  products: ProductSubscription[];
  loadingProducts: boolean;
  productError: Error | null;
  transactionError: Error | null;
  reloadProducts: (productIds?: string[]) => Promise<ProductSubscription[]>;
};

/**
 * Official Expo IAP bridge for Onborn billing.
 *
 * Owns store connection state, serialized purchase callbacks, product caching,
 * restore synchronization, transaction recovery, and post-validation finishing.
 * Pass `billingAdapter` to Onborn hooks unconditionally; use `connected` only
 * when the host app wants to present store-connection UI.
 */
export function useExpoIapBillingAdapter(
  options: ExpoIapBillingAdapterOptions = {},
): ExpoIapBillingAdapter {
  const pendingPurchaseRef = useRef<PendingPurchase | null>(null);
  const connectedRef = useRef(false);
  const connectionWaitersRef = useRef(new Set<ConnectionWaiter>());
  const productCacheRef = useRef<ProductCache | null>(null);
  const productRequestRef = useRef<Promise<ProductSubscription[]> | null>(null);
  const knownProductIdsRef = useRef(new Set(normalizeIds(options.productIds)));
  const [products, setProducts] = useState<ProductSubscription[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<Error | null>(null);
  const [transactionError, setTransactionError] = useState<Error | null>(null);

  useEffect(() => {
    for (const productId of normalizeIds(options.productIds)) {
      knownProductIdsRef.current.add(productId);
    }
  }, [options.productIds]);

  const settlePendingPurchase = useCallback(
    (callback: (item: PendingPurchase) => void) => {
      const item = pendingPurchaseRef.current;
      if (!item) return;
      clearTimeout(item.timeout);
      pendingPurchaseRef.current = null;
      callback(item);
    },
    [],
  );

  const { connected, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: (purchase) => {
      const item = pendingPurchaseRef.current;
      if (!item || item.productId !== purchase.productId) return;
      if (item.dispatching) {
        item.bufferedPurchase = purchase;
        return;
      }
      settlePendingPurchase((current) => current.resolve(purchase));
    },
    onPurchaseError: (error) => {
      const item = pendingPurchaseRef.current;
      if (!item || (error.productId && error.productId !== item.productId)) {
        return;
      }
      const normalized = normalizePurchaseError(error);
      if (item.dispatching) {
        item.bufferedError = normalized;
        return;
      }
      settlePendingPurchase((current) => current.reject(normalized));
    },
  });

  useEffect(() => {
    connectedRef.current = connected;
    if (!connected) return;

    for (const waiter of connectionWaitersRef.current) {
      clearTimeout(waiter.timeout);
      waiter.resolve();
    }
    connectionWaitersRef.current.clear();
  }, [connected]);

  const waitForConnection = useCallback(async (): Promise<void> => {
    if (connectedRef.current) return;

    await new Promise<void>((resolve, reject) => {
      const waiter: ConnectionWaiter = {
        resolve,
        reject,
        timeout: setTimeout(() => {
          connectionWaitersRef.current.delete(waiter);
          reject(new Error("Native store connection timed out."));
        }, options.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS),
      };
      connectionWaitersRef.current.add(waiter);

      // The connection may have completed between the first check and
      // registering this waiter.
      if (connectedRef.current) {
        connectionWaitersRef.current.delete(waiter);
        clearTimeout(waiter.timeout);
        resolve();
      }
    });
  }, [options.connectionTimeoutMs]);

  useEffect(
    () => () => {
      settlePendingPurchase((item) =>
        item.reject(new Error("Purchase interrupted.")),
      );
      for (const waiter of connectionWaitersRef.current) {
        clearTimeout(waiter.timeout);
        waiter.reject(new Error("Native store connection was interrupted."));
      }
      connectionWaitersRef.current.clear();
    },
    [settlePendingPurchase],
  );

  const loadProducts = useCallback(
    async (
      requestedProductIds: string[],
      force = false,
    ): Promise<ProductSubscription[]> => {
      await waitForConnection();

      const requestedIds = normalizeIds(requestedProductIds);
      for (const productId of requestedIds) {
        knownProductIdsRef.current.add(productId);
      }
      if (requestedIds.length === 0) return [];

      const cached = productCacheRef.current;
      if (
        !force &&
        cached &&
        Date.now() - cached.fetchedAt <
          (options.productCacheMs ?? DEFAULT_PRODUCT_CACHE_MS) &&
        requestedIds.every((id) =>
          cached.products.some((product) => product.id === id),
        )
      ) {
        return cached.products.filter((product) =>
          requestedIds.includes(product.id),
        );
      }

      if (!productRequestRef.current) {
        setLoadingProducts(true);
        setProductError(null);
        const allProductIds = Array.from(knownProductIdsRef.current);
        productRequestRef.current = fetchSubscriptionProductsWithRetry(
          allProductIds,
          options.productRetryCount ?? 1,
          options.productRetryDelayMs ?? DEFAULT_PRODUCT_RETRY_DELAY_MS,
        )
          .then((loadedProducts) => {
            productCacheRef.current = {
              products: loadedProducts,
              fetchedAt: Date.now(),
            };
            setProducts(loadedProducts);
            return loadedProducts;
          })
          .catch((error: unknown) => {
            const normalized = normalizeError(
              error,
              "Native store did not return subscription products.",
            );
            setProductError(normalized);
            throw normalized;
          })
          .finally(() => {
            productRequestRef.current = null;
            setLoadingProducts(false);
          });
      }

      const loadedProducts = await productRequestRef.current;
      const matches = loadedProducts.filter((product) =>
        requestedIds.includes(product.id),
      );
      const missingIds = requestedIds.filter(
        (id) => !matches.some((product) => product.id === id),
      );
      if (missingIds.length > 0) {
        throw new Error(
          `Native store did not return requested products: ${missingIds.join(", ")}.`,
        );
      }
      return matches;
    },
    [
      options.productCacheMs,
      options.productRetryCount,
      options.productRetryDelayMs,
      waitForConnection,
    ],
  );

  const reloadProducts = useCallback(
    async (productIds = options.productIds ?? []) => {
      const normalizedIds = normalizeIds(productIds);
      return normalizedIds.length > 0
        ? loadProducts(normalizedIds, true)
        : [];
    },
    [loadProducts, options.productIds],
  );

  const recoverPurchase = useCallback(
    async (productId: string): Promise<Purchase | null> => {
      await wait(
        options.purchaseRecoveryDelayMs ?? DEFAULT_RECOVERY_DELAY_MS,
      );
      try {
        const availablePurchases = await getAvailablePurchases({
          onlyIncludeActiveItemsIOS: true,
        });
        return findPurchase(availablePurchases, productId);
      } catch {
        return null;
      }
    },
    [options.purchaseRecoveryDelayMs],
  );

  const billingAdapter = useMemo(
    () => {
      const nativeAdapter = createNativeStoresBillingAdapter({
        async loadProducts({ storeProductIds }) {
          const nativeProducts = await loadProducts(storeProductIds);
          return nativeProducts.map(normalizeStoreProduct);
        },
        async purchaseProduct({ storeProductId }) {
          await waitForConnection();
          if (pendingPurchaseRef.current) {
            throw new Error("Another purchase is already in progress.");
          }

          knownProductIdsRef.current.add(storeProductId);
          const purchase = await new Promise<Purchase>((resolve, reject) => {
            const timeout = setTimeout(() => {
              settlePendingPurchase((item) =>
                item.reject(new Error("Purchase timed out.")),
              );
            }, options.purchaseTimeoutMs ?? DEFAULT_PURCHASE_TIMEOUT_MS);

            pendingPurchaseRef.current = {
              productId: storeProductId,
              resolve,
              reject,
              timeout,
              dispatching: true,
            };

            void (async () => {
              try {
                const result = await requestPurchase({
                  request:
                    Platform.OS === "android"
                      ? { google: { skus: [storeProductId] } }
                      : { apple: { sku: storeProductId } },
                  type: "subs",
                });
                const item = pendingPurchaseRef.current;
                if (!item || item.productId !== storeProductId) return;
                item.dispatching = false;

                const successfulPurchase =
                  findPurchase(result, storeProductId) ?? item.bufferedPurchase;
                if (successfulPurchase) {
                  settlePendingPurchase((current) =>
                    current.resolve(successfulPurchase),
                  );
                  return;
                }
                if (item.bufferedError) {
                  const recovered = isUserCancelled(item.bufferedError)
                    ? await recoverPurchase(storeProductId)
                    : null;
                  if (recovered && pendingPurchaseRef.current === item) {
                    settlePendingPurchase((current) =>
                      current.resolve(recovered),
                    );
                  } else if (pendingPurchaseRef.current === item) {
                    settlePendingPurchase((current) =>
                      current.reject(item.bufferedError!),
                    );
                  }
                }
              } catch (error) {
                const item = pendingPurchaseRef.current;
                if (!item || item.productId !== storeProductId) return;
                item.dispatching = false;
                if (item.bufferedPurchase) {
                  settlePendingPurchase((current) =>
                    current.resolve(item.bufferedPurchase!),
                  );
                  return;
                }
                const recovered = isUserCancelled(error)
                  ? await recoverPurchase(storeProductId)
                  : null;
                if (recovered && pendingPurchaseRef.current === item) {
                  settlePendingPurchase((current) =>
                    current.resolve(recovered),
                  );
                } else if (pendingPurchaseRef.current === item) {
                  settlePendingPurchase((current) =>
                    current.reject(
                      normalizeError(error, "Unable to start purchase."),
                    ),
                  );
                }
              }
            })();
          });

          return normalizeStorePurchase(purchase);
        },
        async restorePurchases({ products: configuredProducts }) {
          await waitForConnection();
          const subscriptionIds = normalizeIds([
            ...configuredProducts.map((product) => product.storeProductId),
            ...knownProductIdsRef.current,
          ]);

          await synchronizeStorePurchases();
          await wait(
            options.restoreSettleDelayMs ?? DEFAULT_RESTORE_SETTLE_DELAY_MS,
          );

          const [availableResult, activeResult] = await Promise.allSettled([
            getAvailablePurchases({ onlyIncludeActiveItemsIOS: true }),
            getActiveSubscriptions(subscriptionIds),
          ]);
          if (
            availableResult.status === "rejected" &&
            activeResult.status === "rejected"
          ) {
            throw availableResult.reason;
          }

          const restoredPurchases = [
            ...(availableResult.status === "fulfilled"
              ? availableResult.value.map(normalizeRestoredPurchase)
              : []),
            ...(activeResult.status === "fulfilled"
              ? activeResult.value
                  .filter((subscription) => subscription.isActive)
                  .map((subscription) => ({
                    store:
                      Platform.OS === "android"
                        ? ("google_play" as const)
                        : ("app_store" as const),
                    storeProductId: subscription.productId,
                    transactionId: subscription.transactionId,
                    purchaseToken: subscription.purchaseToken ?? undefined,
                    raw: subscription,
                  }))
              : []),
          ];

          return {
            purchases: deduplicateRestoredPurchases(restoredPurchases),
            raw: {
              availablePurchases:
                availableResult.status === "fulfilled"
                  ? availableResult.value
                  : [],
              activeSubscriptions:
                activeResult.status === "fulfilled" ? activeResult.value : [],
            },
          };
        },
      });

      return {
        ...nativeAdapter,
        async finalizePurchase(result: OnbornPurchaseResult) {
          const purchase = findPurchase(result.raw, result.productId);
          if (!purchase) return;
          setTransactionError(null);
          try {
            await finishTransaction({ purchase, isConsumable: false });
          } catch (error) {
            setTransactionError(
              normalizeError(error, "Unable to finish native transaction."),
            );
          }
        },
        async finalizeRestore(result: OnbornRestoreResult) {
          const purchases = findPurchases(result.raw);
          if (purchases.length === 0) return;
          setTransactionError(null);
          const outcomes = await Promise.allSettled(
            purchases.map((purchase) =>
              finishTransaction({ purchase, isConsumable: false }),
            ),
          );
          const failed = outcomes.find(
            (outcome): outcome is PromiseRejectedResult =>
              outcome.status === "rejected",
          );
          if (failed) {
            setTransactionError(
              normalizeError(
                failed.reason,
                "Unable to finish restored native transaction.",
              ),
            );
          }
        },
      } satisfies OnbornBillingAdapter;
    },
    [
      finishTransaction,
      loadProducts,
      options.purchaseTimeoutMs,
      options.restoreSettleDelayMs,
      recoverPurchase,
      requestPurchase,
      settlePendingPurchase,
      waitForConnection,
    ],
  );

  return {
    billingAdapter,
    connected,
    products,
    loadingProducts,
    productError,
    transactionError,
    reloadProducts,
  };
}

async function fetchSubscriptionProductsWithRetry(
  productIds: string[],
  retryCount: number,
  retryDelayMs: number,
): Promise<ProductSubscription[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= Math.max(0, retryCount); attempt += 1) {
    if (attempt > 0) await wait(retryDelayMs);
    try {
      const result = await fetchProducts({ skus: productIds, type: "subs" });
      const products = (result ?? []).filter(
        (product): product is ProductSubscription => product.type === "subs",
      );
      if (products.length > 0) return products;
      lastError = new Error("Native store returned an empty product catalog.");
    } catch (error) {
      lastError = error;
    }
  }
  throw normalizeError(
    lastError,
    "Native store did not return subscription products.",
  );
}

function normalizeStoreProduct(product: ProductSubscription) {
  return {
    id: product.id,
    productId: product.id,
    title: product.title,
    description: product.description,
    displayPrice: product.displayPrice,
    currency: product.currency,
    price: product.price ?? undefined,
    subscriptionPeriod:
      "subscriptionPeriodUnitIOS" in product
        ? product.subscriptionPeriodUnitIOS ?? undefined
        : undefined,
    raw: product,
  };
}

function normalizeStorePurchase(purchase: Purchase) {
  return {
    productId: purchase.productId,
    transactionId: purchase.transactionId ?? purchase.id,
    purchaseToken: purchase.purchaseToken ?? undefined,
    originalTransactionIdentifierIOS:
      "originalTransactionIdentifierIOS" in purchase
        ? purchase.originalTransactionIdentifierIOS ?? undefined
        : undefined,
    raw: purchase,
  };
}

function normalizeRestoredPurchase(purchase: Purchase) {
  return {
    store:
      purchase.store === "google"
        ? ("google_play" as const)
        : ("app_store" as const),
    storeProductId: purchase.productId,
    transactionId:
      ("originalTransactionIdentifierIOS" in purchase
        ? purchase.originalTransactionIdentifierIOS
        : undefined) ??
      purchase.transactionId ??
      purchase.id,
    purchaseToken: purchase.purchaseToken ?? undefined,
    raw: purchase,
  };
}

function deduplicateRestoredPurchases<
  T extends {
    storeProductId: string;
    transactionId?: string;
    purchaseToken?: string;
  },
>(purchases: T[]): T[] {
  return Array.from(
    new Map(
      purchases.map((purchase) => [
        `${purchase.storeProductId}:${purchase.transactionId ?? purchase.purchaseToken ?? ""}`,
        purchase,
      ]),
    ).values(),
  );
}

function findPurchase(value: unknown, productId?: string): Purchase | null {
  const candidates = Array.isArray(value) ? value : [value];
  for (const candidate of candidates) {
    if (
      isPurchase(candidate) &&
      (!productId || candidate.productId === productId)
    ) {
      return candidate;
    }
    if (candidate && typeof candidate === "object" && "raw" in candidate) {
      const nested = findPurchase(
        (candidate as { raw?: unknown }).raw,
        productId,
      );
      if (nested) return nested;
    }
  }
  return null;
}

function findPurchases(value: unknown): Purchase[] {
  const found = new Map<string, Purchase>();
  collectPurchases(value, found, new Set());
  return Array.from(found.values());
}

function collectPurchases(
  value: unknown,
  found: Map<string, Purchase>,
  visited: Set<object>,
): void {
  if (!value || typeof value !== "object") return;
  if (visited.has(value)) return;
  visited.add(value);

  if (isPurchase(value)) {
    found.set(
      `${value.productId}:${value.transactionId ?? value.id}`,
      value,
    );
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPurchases(item, found, visited);
    return;
  }
  for (const nested of Object.values(value)) {
    collectPurchases(nested, found, visited);
  }
}

function isPurchase(value: unknown): value is Purchase {
  return Boolean(
    value &&
      typeof value === "object" &&
      "productId" in value &&
      "transactionDate" in value,
  );
}

function normalizePurchaseError(error: {
  message: string;
  code?: string;
}): Error {
  const normalized = new Error(error.message) as Error & {
    code?: string;
    userCancelled?: boolean;
  };
  normalized.code = error.code;
  normalized.userCancelled = isUserCancelled(error);
  return normalized;
}

function isUserCancelled(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; userCancelled?: unknown };
  return value.userCancelled === true || value.code === "user-cancelled";
}

function normalizeError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
}

function normalizeIds(
  values: Array<string | null | undefined> | undefined,
): string[] {
  return Array.from(
    new Set(
      (values ?? []).filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      ),
    ),
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
