# Changelog

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
