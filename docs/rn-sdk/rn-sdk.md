# ONBORN React Native SDK

The ONBORN React Native SDK renders published onboarding flows and paywalls inside a React Native or Expo app.

Main package: `@onborn/rn-sdk`

Primary runtime components:

- `SubscriptionFlow` for onboarding flows with optional attached paywall.
- `SubscriptionPaywall` for standalone paywalls.
- `useOnbornPaywall` for headless/custom paywall runtime.
- Billing adapters for mock billing, RevenueCat, and custom native-store implementations.

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

## Expo setup

Required peer dependencies:

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

Reanimated requires the babel plugin. Keep it last:

```js
module.exports = {
  presets: ["babel-preset-expo"],
  plugins: ["react-native-reanimated/plugin"],
};
```

Optional dependencies:

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
`expo-video`, Tamagui, and supported font packages. Install those directly only
if your app uses them outside Onborn.

Expo apps are the primary supported path. Use an Expo development build. Expo Go
is not supported for a real Onborn integration because Reanimated, Worklets,
optional Lottie, and native billing modules must be included in your app binary.

## Bare React Native setup

Bare React Native apps can use the SDK, but they must support Expo Modules
because the runtime uses Expo packages for images, fonts, gradients,
localization, store review, and video primitives.

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

Bare RN checklist:

- Confirm Expo Modules autolinking is configured.
- Run pods after installing native packages.
- Keep the Reanimated babel plugin last.
- Rebuild the native app after dependency changes.
- Install `lottie-react-native` only if your published flows use animated assets.

## Quick Start

```tsx
import { SubscriptionFlow } from "@onborn/rn-sdk";
import { View } from "react-native";

export function OnboardingScreen() {
  return (
    <View style={{ flex: 1 }}>
      <SubscriptionFlow
        apiKey={process.env.EXPO_PUBLIC_ONBORN_SDK_API_KEY!}
        flowId="default-onboarding"
        userId="user-123"
        locale="en"
        platform="ios"
        appVersion="1.0.0"
      />
    </View>
  );
}
```

The backend decides which published flow or experiment variant should be returned.

## Standalone Paywall

```tsx
import { SubscriptionPaywall } from "@onborn/rn-sdk";
import { View } from "react-native";

export function PaywallScreen() {
  return (
    <View style={{ flex: 1 }}>
      <SubscriptionPaywall
        apiKey={process.env.EXPO_PUBLIC_ONBORN_SDK_API_KEY!}
        paywallId="main-paywall"
        userId="user-123"
        locale="en"
        platform="ios"
        appVersion="1.0.0"
      />
    </View>
  );
}
```

Standalone paywalls are useful for feature gates, settings screens, or upgrade screens that are not part of an onboarding flow.

## Initial Loading Component

Use `InitialLoadingComponent` to control the first loading state while the SDK fetches initial runtime JSON.

```tsx
import type { InitialLoadingComponentProps } from "@onborn/rn-sdk";
import { ActivityIndicator, Text, View } from "react-native";

function OnbornLoading({ kind, flowId, paywallId }: InitialLoadingComponentProps) {
  const target = kind === "flow" ? flowId : paywallId;

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
      <Text>Loading {target}</Text>
    </View>
  );
}

<SubscriptionFlow
  apiKey={apiKey}
  flowId={flowId}
  InitialLoadingComponent={OnbornLoading}
/>;
```

## Runtime Context

Pass these fields whenever possible:

```tsx
<SubscriptionFlow
  apiKey={apiKey}
  flowId={flowId}
  userId={user.id}
  locale="en"
  platform="ios"
  country="US"
  appVersion="1.0.0"
  userType="new"
/>
```

These values are used for:

- published runtime selection and mobile debugging,
- experiment targeting,
- localized runtime payloads,
- platform-specific billing products.

## Runtime analytics behavior

The React Native SDK emits flow, step, paywall, purchase, restore, and legal-link
events automatically. For app builds, keep analytics enabled because Insights,
Analytics, Experiments, benchmarks, and assistant recommendations depend on
complete event data.

Disable runtime analytics only for internal previews or test harnesses:

```tsx
import { createClient } from "@onborn/rn-sdk";

const client = createClient({
  apiKey,
  flowId,
  emitAnalyticsEvents: false,
  emitSdkConnectionSignal: false,
});
```

For app usage, keep analytics enabled.

In `@onborn/rn-sdk`, analytics queue storage is backed by AsyncStorage by
default. Events can survive an app restart and flush when connectivity returns.
The queue is capped by default to avoid unbounded local storage growth.
The SDK also flushes analytics when the app moves between active/background
states and when the flow/paywall component unmounts.

For event schemas, metric definitions, and standalone event tracking, see
[`analytics.md`](./analytics.md).

## Billing

The SDK renders paywalls, package selectors, restore buttons, and purchase CTAs. The host app is responsible for providing a billing adapter.

### Mock Billing

Use mock billing for test flows and demo apps.

```tsx
import { createMockBillingAdapter, SubscriptionFlow } from "@onborn/rn-sdk";
import { useMemo } from "react";

function Screen() {
  const billingAdapter = useMemo(
    () =>
      createMockBillingAdapter({
        transactionIdPrefix: "demo",
        purchaseDelayMs: 400,
      }),
    [],
  );

  return (
    <SubscriptionFlow
      apiKey={apiKey}
      flowId={flowId}
      billingAdapter={billingAdapter}
    />
  );
}
```

### RevenueCat

Use RevenueCat when the host app already uses RevenueCat as the subscription
provider or when you are migrating gradually. New apps that want Onborn to own
paywalls, analytics, entitlement state, and experimentation should usually start
with the native-store adapter instead.

```tsx
import {
  configureRevenueCatPurchases,
  createRevenueCatBillingAdapter,
  SubscriptionPaywall,
} from "@onborn/rn-sdk";
import Purchases from "react-native-purchases";

await configureRevenueCatPurchases({
  purchases: Purchases,
  billing: runtimeBillingConfig,
  platform: "ios",
  userId,
});

const billingAdapter = createRevenueCatBillingAdapter({
  purchases: Purchases,
});

<SubscriptionPaywall
  apiKey={apiKey}
  paywallId={paywallId}
  userId={userId}
  billingAdapter={billingAdapter}
/>;
```

RevenueCat package matching uses the ONBORN package/product data returned by the backend and RevenueCat offerings from the native SDK.

### Native Stores

Use `createNativeStoresBillingAdapter` if the host app talks directly to
Apple/Google purchases or uses a package such as `expo-iap` or
`react-native-iap`.

Onborn owns paywall rendering, package selection analytics, purchase validation,
and entitlement records. Your app owns the native store purchase sheet and
returns product/purchase evidence to Onborn.

```tsx
import { createNativeStoresBillingAdapter } from "@onborn/rn-sdk";

const billingAdapter = createNativeStoresBillingAdapter({
  async loadProducts({ storeProductIds }) {
    const products = await loadProductsFromNativeStore(storeProductIds);

    return products.map((product) => ({
      storeProductId: product.id,
      title: product.title,
      description: product.description,
      price: product.displayPrice,
      currency: product.currency,
      raw: product,
    }));
  },
  async purchaseProduct({ storeProductId }) {
    const purchase = await purchaseFromNativeStore(storeProductId);

    return {
      storeProductId,
      transactionId: purchase.transactionId,
      purchaseToken: purchase.purchaseToken,
      raw: purchase,
    };
  },
  async restorePurchases() {
    const purchases = await restoreFromNativeStore();

    return {
      purchases: purchases.map((purchase) => ({
        store: purchase.platform === "ios" ? "app_store" : "google_play",
        storeProductId: purchase.productId,
        transactionId: purchase.transactionId,
        purchaseToken: purchase.purchaseToken,
        raw: purchase,
      })),
      raw: purchases,
    };
  },
});
```

ONBORN validates purchase/restore results with the backend. The host app should
pass store identifiers, transaction identifiers, purchase tokens, receipts, and
restored purchases where available.

Production checklist:

- create products in App Store Connect and Google Play Console,
- connect store product ids to packages in Onborn Billing,
- pass the same stable `userId` to the SDK, billing adapter, and your backend,
- return localized price metadata from `loadProducts`,
- test purchase, trial, cancel, failure, restore, entitlement callbacks, server
  entitlement checks, and webhooks in the test environment before promoting to
  prod.

## Billing Callbacks

```tsx
<SubscriptionFlow
  apiKey={apiKey}
  flowId={flowId}
  billingAdapter={billingAdapter}
  onStartTrial={(item) => {
    // Return false to stop the SDK from continuing into purchase flow.
  }}
  onPurchaseStarted={(item) => {}}
  onPurchaseCompleted={(result) => {}}
  onPurchaseFailed={(error) => {}}
  onRestoreCompleted={(result) => {}}
  onRestoreFailed={(error) => {}}
  onEntitlementsChanged={(entitlements) => {}}
  onPaywallShown={({ paywallId, paywallName, stepId }) => {}}
/>
```

If a paywall is attached in the middle of an onboarding flow and purchase validates successfully, the SDK continues to the next step unless step navigation is disabled.

## Custom Native Steps

Use custom renderers for steps that need app-native UI or functionality outside ONBORN primitives.

```tsx
import {
  SubscriptionFlow,
  type NativeCustomStepRenderers,
  type NativeCustomStepRendererProps,
} from "@onborn/rn-sdk";
import { Text, View } from "react-native";

function ProfileStep({ actions }: NativeCustomStepRendererProps) {
  return (
    <View>
      <Text>Native profile setup</Text>
      <Button title="Continue" onPress={() => actions.next()} />
    </View>
  );
}

const customStepRenderers: NativeCustomStepRenderers = {
  "profile-step": ProfileStep,
};

<SubscriptionFlow
  apiKey={apiKey}
  flowId={flowId}
  customStepRenderers={customStepRenderers}
  onCustomStepMissing={({ rendererKey }) => {
    console.warn(`Missing native custom renderer: ${rendererKey}`);
  }}
/>;
```

Custom renderers receive:

- `step`
- `theme`
- `layout`
- current `values`
- navigation/actions
- helpers for rendering ONBORN primitives inside custom UI

## Cache and Offline Behavior

`SubscriptionFlow` uses `AsyncStorage` cache by default.

Runtime strategy:

1. Fetch latest published flow from backend.
2. Cache valid flow response.
3. If network fails, use cached flow.
4. If no cache exists and `fallbackTemplate` is provided, use fallback.

```tsx
<SubscriptionFlow
  apiKey={apiKey}
  flowId={flowId}
  fallbackTemplate="fitness"
/>
```

Fallback templates are a safety net, not the recommended production path.

## Testing and Staging

Current beta SDK runtime URL behavior:

- beta package uses `https://api.testing.onborn.app`
- production package will use `https://api.onborn.app`

The runtime API URL is owned by the package. Customers should not pass an
`apiBaseUrl`; they only pass `apiKey`, `flowId` or `paywallId`, and runtime
context such as `userId`, `locale`, `platform`, `country`, `appVersion`, and
`userType`.

Local demo apps can still inject an internal `fetchImpl` while developing:

```tsx
const testingFetch: typeof fetch = (input, init) => {
  const url = String(input).replace(
    "https://api.testing.onborn.app",
    "http://localhost:3002",
  );
  return fetch(url, init);
};

<SubscriptionFlow
  apiKey={apiKey}
  flowId={flowId}
  fetchImpl={testingFetch}
/>;
```

## Troubleshooting

### Prices show fallback values

Usually the billing adapter did not localize products.

Check:

- products have `storeProductId`,
- RevenueCat/native store returns matching product ids,
- `billingAdapter.loadProducts` runs,
- the selected platform matches product configuration.

### Paywall purchase button does nothing

Check:

- `billingAdapter` is provided,
- selected package has a product,
- native purchase implementation resolves or throws,
- backend purchase validation endpoint is configured.

### Flow returns 404

Check:

- the flow is published,
- SDK API key belongs to the correct project/app,
- `flowId` is the public runtime id expected by backend,
- testing/prod API URL points to the right environment.

### Images do not render

Check:

- image asset exists in storage,
- backend returns a usable `src`,
- signed URL did not expire before runtime,
- device can reach the asset URL.

### Custom native step is blank

Check:

- step type is `native_custom`,
- `native.rendererKey` matches `customStepRenderers`,
- `onCustomStepMissing` logs missing keys.
