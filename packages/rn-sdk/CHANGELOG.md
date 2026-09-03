# Changelog

## 0.8.0-beta.3

- `OnbornFlow` falls back to the paywall's designed sample plans when no offering can be loaded, with a console warning; purchases from them are refused.
- Rebuilt against runtime-ui-ir 0.7.0-beta.3 (native `Switch`), runtime-expo-ui-ir 0.7.0-beta.3, billing 0.7.0-beta.3, analytics 0.8.0-beta.2 and sdk-contracts 0.8.0-beta.2.

## 0.8.0-beta.2

- Rebuilt against runtime-ui-ir 0.7.0-beta.2, runtime-expo-ui-ir 0.7.0-beta.2 and billing 0.7.0-beta.2 (RulerPicker inert on the builder canvas).

## 0.8.0-beta.1

- Built-in capabilities: `expo-haptics` and `expo-video` ship with the SDK, so a flow that plays a clip or taps on a picker reaches every app carrying the SDK without an app release. Lottie is picked up automatically when `lottie-react-native` is installed. Capabilities lent through the `capabilities` prop still win.
- New native dependency `expo-haptics`: run `pod install` after upgrading.

## 0.3.0-beta.1

- Added `OnbornFlow` for signed Builder V2 UI IR delivery.
- Added automatic analytics instrumentation from signed release metadata.
- Added automatic Expo IAP purchase, restore, validation, and entitlement
  handling.
- Added strict host capability negotiation and last-known-good recovery.
- Kept API keys and backend URLs out of component props.

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
