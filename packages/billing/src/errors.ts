/**
 * Normalized purchase errors.
 *
 * Store SDKs report failures with their own vocabulary (expo-iap's
 * `ErrorCode`, StoreKit/Play error objects, RevenueCat codes), which pushed
 * every host app into sniffing raw error shapes just to answer the one
 * question every paywall asks: "did the user cancel, or did something break?".
 * Adapters map their store's error onto `OnbornPurchaseError` so apps branch
 * on a stable code instead of a provider's internals.
 */

export type OnbornPurchaseErrorCode =
  /** The customer dismissed the store sheet. Not an error to report. */
  | "user_cancelled"
  /** The customer already owns this product; restore instead of buying. */
  | "already_owned"
  /** Store/billing service unreachable or not initialized on this device. */
  | "store_unavailable"
  /** Transport failure talking to the store. Retrying is reasonable. */
  | "network_error"
  /** The SKU is missing, not approved, or unavailable in this storefront. */
  | "product_unavailable"
  /** Purchase is awaiting external action (Ask to Buy, SCA, slow payment). */
  | "pending"
  /** The store accepted the purchase but ONBORN could not validate it. */
  | "validation_failed"
  /** Purchase is not permitted (parental controls, restricted device). */
  | "not_allowed"
  /** Anything the adapter could not classify. */
  | "unknown";

export class OnbornPurchaseError extends Error {
  readonly code: OnbornPurchaseErrorCode;
  /** The store's own code, kept for logging and support tickets. */
  readonly storeCode?: string;
  readonly productId?: string;
  readonly cause?: unknown;

  constructor(
    code: OnbornPurchaseErrorCode,
    message: string,
    options?: { storeCode?: string; productId?: string; cause?: unknown },
  ) {
    super(message);
    this.name = "OnbornPurchaseError";
    this.code = code;
    this.storeCode = options?.storeCode;
    this.productId = options?.productId;
    this.cause = options?.cause;
  }

  /** True when the customer dismissed the purchase sheet themselves. */
  get userCancelled(): boolean {
    return this.code === "user_cancelled";
  }
}

/**
 * The one check every paywall needs: a cancelled purchase must stay silent,
 * anything else deserves a message. Works on `OnbornPurchaseError` and on raw
 * store errors, so it is safe to call on anything a `catch` block receives.
 */
export function isUserCancelledError(error: unknown): boolean {
  if (error instanceof OnbornPurchaseError) {
    return error.userCancelled;
  }
  return readStoreErrorCode(error) === "user_cancelled";
}

/** Coerce anything thrown by a store into a normalized purchase error. */
export function toOnbornPurchaseError(
  error: unknown,
  options?: { productId?: string },
): OnbornPurchaseError {
  if (error instanceof OnbornPurchaseError) {
    return error;
  }
  const record =
    error && typeof error === "object"
      ? (error as { code?: unknown; message?: unknown; productId?: unknown })
      : {};
  const storeCode = typeof record.code === "string" ? record.code : undefined;
  const message =
    typeof record.message === "string" && record.message.trim()
      ? record.message
      : "The purchase could not be completed.";
  return new OnbornPurchaseError(readStoreErrorCode(error) ?? "unknown", message, {
    storeCode,
    productId:
      options?.productId ??
      (typeof record.productId === "string" ? record.productId : undefined),
    cause: error,
  });
}

// expo-iap `ErrorCode` values, plus the shapes StoreKit/Play surface directly.
const STORE_ERROR_CODES: Record<string, OnbornPurchaseErrorCode> = {
  "user-cancelled": "user_cancelled",
  "user-error": "user_cancelled",
  "already-owned": "already_owned",
  "duplicate-purchase": "already_owned",
  "network-error": "network_error",
  "remote-error": "network_error",
  "service-timeout": "network_error",
  "billing-unavailable": "store_unavailable",
  "iap-not-available": "store_unavailable",
  "init-connection": "store_unavailable",
  "not-prepared": "store_unavailable",
  "connection-closed": "store_unavailable",
  "service-disconnected": "store_unavailable",
  "service-error": "store_unavailable",
  "activity-unavailable": "store_unavailable",
  "item-unavailable": "product_unavailable",
  "sku-not-found": "product_unavailable",
  "query-product": "product_unavailable",
  "empty-sku-list": "product_unavailable",
  "sku-offer-mismatch": "product_unavailable",
  pending: "pending",
  "deferred-payment": "pending",
  "transaction-validation-failed": "validation_failed",
  "purchase-verification-failed": "validation_failed",
  "receipt-failed": "validation_failed",
  "feature-not-supported": "not_allowed",
  "developer-error": "not_allowed",
};

function readStoreErrorCode(error: unknown): OnbornPurchaseErrorCode | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const value = error as { code?: unknown; userCancelled?: unknown };
  // StoreKit surfaces cancellation as a boolean on some paths.
  if (value.userCancelled === true) {
    return "user_cancelled";
  }
  if (typeof value.code !== "string") {
    return undefined;
  }
  return STORE_ERROR_CODES[value.code.toLowerCase()];
}
