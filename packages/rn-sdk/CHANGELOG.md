# Changelog

## 0.2.0-beta.2

- Bumped `@onborn/billing` to `0.1.0-beta.9`.

## 0.2.0-beta.1

- Analytics events now carry the required `flowName` field. The SDK fills it from the
  published flow's and paywall's own names, so builder integrations need no new config.
- Added optional `onboardingFlowName` / `paywallName` overrides to
  `ConversionFlowClientOptions` and `Onborn.init`.

## 0.1.0-beta.3

- Updated `@onborn/billing` to the current-offering API; consumers no longer
  pass an offering ID when loading headless billing data.

## 0.1.0-beta.2

- Moved headless offerings, purchases, restores, entitlements, and billing
  adapters into the lightweight `@onborn/billing` package.
- Re-exported billing APIs from the full renderer SDK for apps that use Onborn
  flows or paywalls.
- Reused the shared billing client inside the flow and paywall renderer.

## 0.1.0-beta.1

- Unified runtime initialization with `@onborn/analytics` through `Onborn.init`.
- Removed separate analytics client creation from the React Native runtime.

## 0.1.0-beta.0

Initial beta release candidate.

- Added `SubscriptionFlow` for rendering published onboarding flows.
- Added `SubscriptionPaywall` for standalone paywalls.
- Added RevenueCat, native-store bridge, custom, and mock billing adapter support.
- Added persistent React Native analytics queue storage and app-state flush behavior.
- Added package-owned beta API URL: `https://api.testing.onborn.app`.
