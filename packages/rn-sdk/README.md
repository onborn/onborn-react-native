# Onborn React Native SDK

Render signed Onborn onboarding flows and paywalls in React Native or Expo
apps.

```tsx
import { Onborn, OnbornFlow } from "@onborn/rn-sdk";

await Onborn.initAsync({
  apiKey: process.env.EXPO_PUBLIC_ONBORN_SDK_API_KEY!,
  userId: "user-123",
  locale: "en",
  appVersion: "1.0.0",
});

export function Onboarding() {
  return (
    <OnbornFlow
      flowId="default-onboarding"
      onComplete={() => finishOnboarding()}
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

The SDK owns the Onborn API URL, trusted artifact keys, analytics
instrumentation, and native billing integration. Apps provide an SDK API key
and runtime context, not a backend base URL, offering ID, billing adapter, or
artifact key.

`@onborn/rn-sdk` depends on `@onborn/billing`, `@onborn/analytics`, and
the signed UI IR runtime packages, so published apps install only
`@onborn/rn-sdk` for the full subscription flow SDK.

If your app owns its onboarding and paywall UI, install
`@onborn/billing` instead. It provides offerings, native-store adapters,
purchase validation, restores, and entitlement hooks without the renderer,
Tamagui, fonts, or Expo UI dependencies.

## Initialize once

Call `Onborn.initAsync` once before rendering `OnbornFlow`. The SDK does not
accept API keys through component props.

```ts
import { Onborn } from "@onborn/rn-sdk";

await Onborn.initAsync({
  apiKey: process.env.EXPO_PUBLIC_ONBORN_SDK_API_KEY!,
  userId: currentUser?.id,
  locale: "en",
  appVersion: "1.0.0",
});
```

`initAsync` persists the anonymous id it generates when the app has no
`userId` yet. The synchronous `Onborn.init` creates a new one on every cold
start, which makes funnels, retention, and experiment assignment meaningless.
A `cf_test_` key serves the test release and a `cf_live_` key the production
one.

All SDK components and hooks read this runtime configuration.
The same singleton is provided by `@onborn/analytics`, so apps that start with
standalone analytics can later add the React Native SDK without introducing a
second client or configuration path.

### Expo setup

Yarn:

```sh
yarn add expo-file-system expo-iap react-native-reanimated react-native-worklets
```

NPM:

```sh
npm install expo-file-system expo-iap react-native-reanimated react-native-worklets
```

PNPM:

```sh
pnpm add expo-file-system expo-iap react-native-reanimated react-native-worklets
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

Install `lottie-react-native` only if your flows include animated assets. The
SDK picks the player up on its own once the package is installed — the
animations travel inside the artifact, the native player is the app's to
install. Lending `capabilities={{ lottie: { LottieView } }}` is still
possible when you want to supply a different player.

Video and haptics need no install of their own: `expo-video` and
`expo-haptics` ship with the SDK, so a flow that starts playing a clip or
tapping on a picker reaches every app that carries the SDK without an app
release.

A flow whose screens animate is published with a `lottie` requirement; an app
without the package is judged incompatible before anything renders.

Sign-in works the same way — the flow renders the button, the app owns what
signing in means:

```tsx
<OnbornFlow
  flowId="onboarding"
  capabilities={{
    auth: {
      signIn: async () => router.push("/login"),
      signUp: async () => router.push("/register"),
    },
  }}
/>
```

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
video primitives, signed artifact storage, and native billing.

```sh
yarn add expo-file-system expo-iap react-native-reanimated react-native-worklets
npx pod-install
```

NPM:

```sh
npm install expo-file-system expo-iap react-native-reanimated react-native-worklets
npx pod-install
```

PNPM:

```sh
pnpm add expo-file-system expo-iap react-native-reanimated react-native-worklets
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

## Builder V2 billing

`OnbornFlow` automatically loads the current offering, opens the native Expo
IAP purchase sheet, validates purchases with Onborn, restores transactions,
refreshes entitlements, and emits signed analytics events. The host app does
not pass an offering ID or billing adapter.

Use `onEntitlementsChanged` when the app must immediately react to a successful
purchase or restore:

```tsx
<OnbornFlow
  flowId="default-onboarding"
  onEntitlementsChanged={(entitlements) => {
    updatePremiumState(entitlements.some((item) => item.active));
  }}
/>;
```

## Builder V2 artifact delivery

`OnbornFlow` loads the active release from:

```text
GET /runtime/v2/flows/:flowId/artifact?target=ios|android&userId=...&sessionId=...
```

The identity parameters are what a running experiment assigns on.

The SDK validates capability compatibility, SHA-256 integrity, the Ed25519
signature, and the UI IR document before rendering. A verified compatible
artifact becomes the last-known-good offline release. Invalid or unsigned
artifacts fail closed.

The host app keeps Metro, Expo Router, EAS Update, and its existing build
pipeline. Builder V2 does not require Re.Pack or execute downloaded JavaScript.

## Automatic analytics

The publication compiler signs analytics instrumentation together with UI IR.
`OnbornFlow` automatically reports screen views, navigation, declared
interactions, paywall views, purchase outcomes, and restores. The host app does
not add tracking handlers to generated controls.

## Native capabilities

Notifications, camera, and haptics need native modules, config plugins, and
permission strings that belong to your app, so the SDK carries your
implementation rather than bundling one. A flow can only use what arrived here.

```tsx
import type { OnbornHostCapabilities } from "@onborn/rn-sdk";

const capabilities: OnbornHostCapabilities = {
  haptics: {
    async trigger(style) {
      await impactAsync(style);
    },
  },
};

<OnbornFlow flowId={flowId} capabilities={capabilities} />;
```

## Loading and error states

```tsx
<OnbornFlow
  flowId={flowId}
  renderLoading={() => <MySpinner />}
  renderError={(error, retry) => (
    <MyErrorState detail={error.message} onRetry={retry} />
  )}
/>;
```

`renderError` is reached only when there is nothing to render: no network and
no previously verified artifact, or a release this SDK version cannot serve.

## Custom paywall UI

If your app renders its own paywall, install `@onborn/billing` instead. It
provides offerings, native-store adapters, purchase validation, restores, and
entitlement hooks without the renderer.

## Documentation

Full GitHub-rendered docs:

- [React Native SDK](../../docs/rn-sdk/rn-sdk.md)
- [Headless billing](../../docs/rn-sdk/billing.md)
- [Analytics](../../docs/rn-sdk/analytics.md)
- [SDK contracts](../../docs/rn-sdk/sdk-contracts.md)
