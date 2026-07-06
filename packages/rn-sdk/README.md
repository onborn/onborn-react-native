# Onborn React Native SDK

Render Onborn onboarding flows and paywalls in React Native or Expo apps.

```tsx
import { SubscriptionFlow } from "@onborn/rn-sdk";

export function Onboarding() {
  return (
    <SubscriptionFlow
      apiKey={process.env.EXPO_PUBLIC_ONBORN_SDK_API_KEY!}
      flowId="default-onboarding"
      userId="user-123"
      locale="en"
      platform="ios"
      appVersion="1.0.0"
    />
  );
}
```

## Install package

Yarn:

```sh
yarn add @onborn/rn-sdk
```

NPM:

```sh
npm install @onborn/rn-sdk
```

PNPM:

```sh
pnpm add @onborn/rn-sdk
```

The SDK owns the Onborn API URL. Apps provide an SDK API key and runtime
context, not a backend base URL.

### Expo setup

Yarn:

```sh
yarn add react-native-reanimated react-native-worklets
```

NPM:

```sh
npm install react-native-reanimated react-native-worklets
```

PNPM:

```sh
pnpm add react-native-reanimated react-native-worklets
```

Add the Reanimated babel plugin and keep it last:

```js
module.exports = {
  presets: ["babel-preset-expo"],
  plugins: ["react-native-reanimated/plugin"],
};
```

Optional:

Yarn:

```sh
yarn add lottie-react-native
```

NPM:

```sh
npm install lottie-react-native
```

PNPM:

```sh
pnpm add lottie-react-native
```

Use `lottie-react-native` only if your flows include animated assets.

The SDK bundles `react-native-safe-area-context`, `react-native-svg`, `expo-font`,
`expo-image`, `expo-linear-gradient`, `expo-localization`, `expo-store-review`,
`expo-video`, Tamagui, and supported font packages. Install them directly only
if your app uses them outside Onborn.

Use an Expo development build. Expo Go is not supported for a real Onborn
integration because Reanimated, Worklets, optional Lottie, and native billing
modules must be included in your app binary.

### Bare React Native setup

Bare React Native apps must support Expo Modules because the SDK uses Expo
packages internally for images, fonts, gradients, localization, store review,
and video primitives.

```sh
yarn add react-native-reanimated react-native-worklets
npx pod-install
```

NPM:

```sh
npm install react-native-reanimated react-native-worklets
npx pod-install
```

PNPM:

```sh
pnpm add react-native-reanimated react-native-worklets
pnpm exec pod-install
```

```js
module.exports = {
  presets: ["module:@react-native/babel-preset"],
  plugins: [
    // Must stay last.
    "react-native-reanimated/plugin",
  ],
};
```

## Standalone Paywall

```tsx
import { SubscriptionPaywall } from "@onborn/rn-sdk";

<SubscriptionPaywall
  apiKey={apiKey}
  paywallId="main-paywall"
  userId="user-123"
/>;
```

## Billing

ONBORN renders the paywall UI, tracks purchase intent, validates purchases, and
stores entitlements. The host app provides the native purchase prompt through a
billing adapter.

```tsx
import { createNativeStoresBillingAdapter } from "@onborn/rn-sdk";

const billingAdapter = createNativeStoresBillingAdapter({
  async loadProducts({ storeProductIds }) {
    return getStoreProducts(storeProductIds);
  },
  async purchaseProduct({ storeProductId }) {
    return purchaseStoreProduct(storeProductId);
  },
  async restorePurchases() {
    return getAvailableStorePurchases();
  },
});

<SubscriptionFlow
  apiKey={apiKey}
  flowId={flowId}
  billingAdapter={billingAdapter}
/>;
```

Use the RevenueCat adapter only when you already use RevenueCat or are migrating
gradually from it.

For local demos, use:

```tsx
import { createMockBillingAdapter } from "@onborn/rn-sdk";

const billingAdapter = createMockBillingAdapter();
```

## Initial Loading

```tsx
import type { InitialLoadingComponentProps } from "@onborn/rn-sdk";

function InitialLoading({ kind }: InitialLoadingComponentProps) {
  return <MySpinner label={`Loading ${kind}`} />;
}

<SubscriptionFlow
  apiKey={apiKey}
  flowId={flowId}
  InitialLoadingComponent={InitialLoading}
/>;
```

## Documentation

Full GitHub-rendered docs:

- [React Native SDK](../../docs/rn-sdk/rn-sdk.md)
- [Analytics](../../docs/rn-sdk/analytics.md)
- [SDK contracts](../../docs/rn-sdk/sdk-contracts.md)
