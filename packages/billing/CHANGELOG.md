# Changelog

## 0.1.0-beta.2

- Removed `offeringId` from `useOnbornOffering` and
  `BillingClient.loadOffering`.
- Billing now loads only the offering marked Current for the project
  environment.

## 0.1.0-beta.1

- Added headless offering, paywall, purchase, restore, and entitlement APIs.
- Added native-store, RevenueCat, and mock billing adapters.
- Added shared initialization through `Onborn.init(...)` from `@onborn/analytics`.
