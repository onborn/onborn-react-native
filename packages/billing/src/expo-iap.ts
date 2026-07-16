import {
  fetchProducts,
  getActiveSubscriptions,
  getAvailablePurchases,
  initConnection,
  isEligibleForIntroOfferIOS,
  restorePurchases as synchronizeStorePurchases,
  type ProductSubscription,
  type Purchase,
  type SubscriptionOffer,
  useIAP,
} from "expo-iap";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import type {
  BillingPeriod,
  BillingProductOffer,
} from "@onborn/sdk-contracts";
import { createNativeStoresBillingAdapter } from "./adapters/nativeStores";
import {
  isUserCancelledError,
  OnbornPurchaseError,
  toOnbornPurchaseError,
} from "./errors";
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

/**
 * Lifecycle of the native store connection.
 *
 * `connected: false` alone cannot tell "still connecting" from "gave up",
 * which is the difference between showing a spinner and showing a retry
 * button — so every app ended up rebuilding this with its own timers.
 */
export type ExpoIapConnectionState = "connecting" | "ready" | "unavailable";

export type ExpoIapBillingAdapter = {
  /**
   * Adapter that can be passed to Onborn hooks immediately. Store
   * operations wait for the native IAP connection internally.
   */
  billingAdapter: OnbornBillingAdapter;
  /** Native store connection state for optional loading and disabled UI. */
  connected: boolean;
  /** Same signal as `connected`, but distinguishes "connecting" from "gave up". */
  connectionState: ExpoIapConnectionState;
  /** Re-attempt a store connection after `connectionState` went unavailable. */
  retryConnection: () => Promise<void>;
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
  const [connectionState, setConnectionState] =
    useState<ExpoIapConnectionState>("connecting");
  const [connectionAttempt, setConnectionAttempt] = useState(0);
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

    setConnectionState("ready");
    for (const waiter of connectionWaitersRef.current) {
      clearTimeout(waiter.timeout);
      waiter.resolve();
    }
    connectionWaitersRef.current.clear();
  }, [connected]);

  // Give up on the same budget store operations use, so the UI can offer a
  // retry instead of spinning forever.
  useEffect(() => {
    if (connected) {
      return;
    }
    setConnectionState("connecting");
    const timeout = setTimeout(
      () => setConnectionState("unavailable"),
      options.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS,
    );
    return () => clearTimeout(timeout);
  }, [connected, connectionAttempt, options.connectionTimeoutMs]);

  const retryConnection = useCallback(async (): Promise<void> => {
    if (connectedRef.current) {
      return;
    }
    setConnectionState("connecting");
    // Restart the give-up timer even when initConnection resolves instantly;
    // `connected` only flips once expo-iap's own listener fires.
    setConnectionAttempt((attempt) => attempt + 1);
    try {
      await initConnection();
    } catch {
      // Leave the state machine to the timer: a failed attempt is only
      // "unavailable" once the budget is actually spent.
    }
  }, []);

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
          const eligibility = await resolveIntroOfferEligibility(nativeProducts);
          return nativeProducts.map((product) =>
            normalizeStoreProduct(product, eligibility),
          );
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
                  const recovered = isUserCancelledError(item.bufferedError)
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
                const recovered = isUserCancelledError(error)
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
    connectionState,
    retryConnection,
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

function normalizeStoreProduct(
  product: ProductSubscription,
  offerEligibility?: OfferEligibilityLookup,
) {
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
    billingPeriod: readProductBillingPeriod(product),
    introOffer: readProductIntroOffer(product, offerEligibility),
    raw: product,
  };
}

/** Eligibility answers keyed by iOS subscription group, resolved up front. */
type OfferEligibilityLookup = (product: ProductSubscription) => boolean;

function readSubscriptionGroupId(
  product: ProductSubscription,
): string | undefined {
  const groupId = (product as { subscriptionGroupIdIOS?: string | null })
    .subscriptionGroupIdIOS;
  return typeof groupId === "string" && groupId.trim() ? groupId : undefined;
}

/**
 * Ask the App Store which subscription groups this customer may still claim an
 * intro offer in. Answers are resolved once per group (not per product, since
 * a group usually holds several SKUs) and only on iOS: Play already filters
 * offers by eligibility, so its advertised offers are usable as-is.
 *
 * A failed check falls back to "eligible" — the store itself is the final
 * authority at purchase time, so a hidden offer costs a conversion while a
 * shown one merely reverts to the standard price.
 */
async function resolveIntroOfferEligibility(
  products: ProductSubscription[],
): Promise<OfferEligibilityLookup> {
  if (Platform.OS !== "ios") {
    return () => true;
  }
  const groupIds = new Set(
    products
      .filter(
        (product) =>
          (product as { subscriptionOffers?: SubscriptionOffer[] | null })
            .subscriptionOffers?.length,
      )
      .map(readSubscriptionGroupId)
      .filter((groupId): groupId is string => Boolean(groupId)),
  );
  if (groupIds.size === 0) {
    return () => true;
  }
  const results = await Promise.all(
    Array.from(groupIds).map(async (groupId) => {
      try {
        return [groupId, await isEligibleForIntroOfferIOS(groupId)] as const;
      } catch {
        return [groupId, true] as const;
      }
    }),
  );
  const eligibilityByGroup = new Map(results);
  return (product) => {
    const groupId = readSubscriptionGroupId(product);
    if (!groupId) {
      return true;
    }
    return eligibilityByGroup.get(groupId) ?? true;
  };
}

function toBillingPeriodUnit(
  unit: string | null | undefined,
): BillingPeriod["unit"] | undefined {
  switch (unit?.toLowerCase()) {
    case "day":
      return "day";
    case "week":
      return "week";
    case "month":
      return "month";
    case "year":
      return "year";
    default:
      // "unknown"/"empty" are real store values; treat them as no period
      // rather than guessing a unit and corrupting downstream price math.
      return undefined;
  }
}

function readProductBillingPeriod(
  product: ProductSubscription,
): BillingPeriod | undefined {
  const record = product as {
    subscriptionPeriodUnitIOS?: string | null;
    subscriptionPeriodNumberIOS?: string | null;
    subscriptionOffers?: SubscriptionOffer[] | null;
  };
  const unit = toBillingPeriodUnit(record.subscriptionPeriodUnitIOS);
  if (unit) {
    const count = Number(record.subscriptionPeriodNumberIOS ?? 1);
    return { unit, count: Number.isFinite(count) && count > 0 ? count : 1 };
  }
  // Android reports the renewal period on the base plan's regular offer.
  for (const offer of record.subscriptionOffers ?? []) {
    if (offer.type === "introductory" || offer.type === "promotional") {
      continue;
    }
    const period = toBillingPeriod(offer.period);
    if (period) {
      return period;
    }
  }
  return undefined;
}

function toBillingPeriod(
  period: SubscriptionOffer["period"],
): BillingPeriod | undefined {
  const unit = toBillingPeriodUnit(period?.unit);
  if (!unit) {
    return undefined;
  }
  const count = period?.value ?? 1;
  return { unit, count: Number.isFinite(count) && count > 0 ? count : 1 };
}

function toOfferPaymentMode(
  mode: string | null | undefined,
): NonNullable<BillingProductOffer["paymentMode"]> {
  switch (mode?.toLowerCase()) {
    case "free-trial":
      return "free_trial";
    case "pay-as-you-go":
      return "pay_as_you_go";
    case "pay-up-front":
      return "pay_up_front";
    default:
      return "unknown";
  }
}

/**
 * Resolve the introductory offer a customer can actually use.
 *
 * Both stores advertise offers on the product, but "advertised" is not
 * "available to this customer": on iOS the App Store only honours an intro
 * offer once per subscription group, so eligibility must be checked against
 * that group. Play only returns offers the customer qualifies for, so their
 * presence is the answer. An offer the customer cannot redeem is omitted
 * entirely — showing its price would be a lie on the paywall.
 */
function readProductIntroOffer(
  product: ProductSubscription,
  offerEligibility?: OfferEligibilityLookup,
): BillingProductOffer | undefined {
  const offers =
    (product as { subscriptionOffers?: SubscriptionOffer[] | null })
      .subscriptionOffers ?? [];
  const offer =
    offers.find((item) => item.type === "introductory") ??
    offers.find((item) => item.type === "promotional");
  if (!offer) {
    return undefined;
  }
  const eligible = offerEligibility ? offerEligibility(product) : true;
  if (!eligible) {
    return undefined;
  }
  return {
    ...(offer.id ? { id: offer.id } : {}),
    type: offer.type === "promotional" ? "promotional" : "introductory",
    ...(offer.displayPrice ? { price: offer.displayPrice } : {}),
    ...(typeof offer.price === "number" && Number.isFinite(offer.price)
      ? { priceAmount: offer.price }
      : {}),
    ...(offer.currency ? { currency: offer.currency } : {}),
    paymentMode: toOfferPaymentMode(offer.paymentMode),
    ...(toBillingPeriod(offer.period)
      ? { period: toBillingPeriod(offer.period) }
      : {}),
    ...(typeof offer.periodCount === "number" && offer.periodCount > 0
      ? { periodCount: offer.periodCount }
      : {}),
    eligible: true,
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
  productId?: string;
}): OnbornPurchaseError {
  return toOnbornPurchaseError(error, { productId: error.productId });
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
