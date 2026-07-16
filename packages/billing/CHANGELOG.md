# Changelog

## 0.1.0-beta.6

- Added `OnbornPurchaseError` with a normalized `code` (`user_cancelled`, `already_owned`, `store_unavailable`, `network_error`, `product_unavailable`, `pending`, `validation_failed`, `not_allowed`, `unknown`), plus `isUserCancelledError` and `toOnbornPurchaseError`. Apps no longer sniff raw store error shapes to tell a cancelled purchase from a real failure.
- Added price helpers: `formatPrice`, `getPricePerPeriod` (the "only X/week" line), `parseBillingPeriod`, and `resolveBillingPeriod`. They return `undefined` rather than a guess when the period or amount is unknown.
- The native store adapter now populates `priceAmount`, `billingPeriod`, and `introOffer` on products. iOS intro-offer eligibility is checked per subscription group; offers the customer cannot redeem are omitted.
- `useOnbornEntitlements({ cache: true })` keeps the last known entitlements per user and replays them on cold start, exposing a `stale` flag until a fresh response lands. The server stays authoritative.
- `useExpoIapBillingAdapter` exposes `connectionState` (`connecting`/`ready`/`unavailable`) and `retryConnection()`, so apps stop hand-rolling connection timeout state.
- A failed native store product load no longer discards a valid offering: the paywall renders with synced catalog prices instead of showing a retry button.

## 0.1.0-beta.5

- Wait for the native store connection before loading localized products,
  purchasing, or restoring. This prevents a cold-open paywall from showing an
  unavailable state that only clears after a manual retry.

## 0.1.0-beta.4

- Surface native store product-loading failures instead of silently falling
  back to backend catalog metadata without localized store prices.
- Add the optional `@onborn/billing/expo-iap` adapter with product caching,
  serialized purchases, StoreKit restore synchronization, transaction recovery,
  and automatic purchase/restore transaction finishing after Onborn server
  validation.

## 0.1.0-beta.3

- Fixed StoreKit 2 purchases incorrectly using the signed transaction JWS as
  the transaction identifier.
- Bounded purchase idempotency keys when only a signed purchase token is
  available.
- Added structured billing request errors with backend messages and codes.

## 0.1.0-beta.2

- Removed `offeringId` from `useOnbornOffering` and
  `BillingClient.loadOffering`.
- Billing now loads only the offering marked Current for the project
  environment.

## 0.1.0-beta.1

- Added headless offering, paywall, purchase, restore, and entitlement APIs.
- Added native-store, RevenueCat, and mock billing adapters.
- Added shared initialization through `Onborn.init(...)` from `@onborn/analytics`.
