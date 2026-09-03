# Onborn React Native SDK

`@onborn/rn-sdk` renders published Onborn onboarding flows and paywalls in
Expo and bare React Native apps. Builder V2 ships signed UI IR artifacts, so
the host app keeps Metro, Expo Router, EAS Update, and its existing build
pipeline.

The SDK owns:

- the Onborn API URL and environment resolution;
- artifact download, Ed25519 verification, compatibility checks, and caching;
- React Native rendering for supported UI IR capabilities;
- localization and journey navigation;
- automatic interaction analytics;
- offering resolution, Expo IAP purchases, restores, validation, and
  entitlement refresh.

The host app provides an SDK API key and application context. It does not pass
an API URL, artifact key, offering ID, billing adapter, or UI component map.

## Install

### Expo

Yarn:

```sh
yarn add @onborn/rn-sdk expo-file-system expo-iap react-native-reanimated react-native-worklets
```

NPM:

```sh
npm install @onborn/rn-sdk expo-file-system expo-iap react-native-reanimated react-native-worklets
```

PNPM:

```sh
pnpm add @onborn/rn-sdk expo-file-system expo-iap react-native-reanimated react-native-worklets
```

Keep the Reanimated plugin last:

```js
module.exports = {
  presets: ["babel-preset-expo"],
  plugins: ["react-native-reanimated/plugin"],
};
```

Use an Expo development build. Expo Go is not supported because native billing
and runtime dependencies must be included in the application binary.

### Bare React Native

Bare React Native projects must have Expo Modules configured:

```sh
yarn add @onborn/rn-sdk expo-file-system expo-iap react-native-reanimated react-native-worklets
npx pod-install
```

Keep the Reanimated plugin last:

```js
module.exports = {
  presets: ["module:@react-native/babel-preset"],
  plugins: ["react-native-reanimated/plugin"],
};
```

Rebuild the native app after adding or changing native dependencies.

## Initialize Once

Call `Onborn.initAsync` before rendering an Onborn flow:

```ts
import { Onborn } from "@onborn/rn-sdk";

await Onborn.initAsync({
  apiKey: process.env.EXPO_PUBLIC_ONBORN_SDK_API_KEY!,
  userId: currentUser?.id,
  locale: "en",
  appVersion: "1.0.0",
});
```

`initAsync` persists the generated anonymous id on the device when the app has
no `userId` yet. The synchronous `init` generates a new one on every cold
start, which breaks funnel stitching, retention, and experiment assignment.

The SDK does not accept an API key through component props or hook arguments.
`cf_test_` keys load test releases and `cf_live_` keys load production
releases.

### Initialization Options

| Option | Type | Required | Purpose |
| --- | --- | --- | --- |
| `apiKey` | `string` | Yes | Project SDK key with a supported environment prefix. |
| `userId` | `string` | No | Stable application user identifier. |
| `locale` | `string` | No | Preferred locale. The flow falls back to its default locale. |
| `platform` | `"ios" \| "android" \| "web"` | No | Analytics platform context. Native artifact target is resolved from React Native. |
| `appId` | `string` | No | Host application identifier used by analytics. |
| `country` | `string` | No | Optional country context. |
| `userType` | `"new" \| "returning"` | No | Optional analytics segmentation. |
| `appVersion` | `string` | No | Host application version. |
| `emitAnalyticsEvents` | `boolean` | No | Set to `false` to disable automatic analytics. Defaults to enabled. |
| `autoFlushMs` | `number` | No | Analytics auto-flush interval. |
| `fetchImpl` | `typeof fetch` | No | Test-only or specialized fetch implementation. |

## Render a Flow

```tsx
import { OnbornFlow } from "@onborn/rn-sdk";

export function OnboardingScreen() {
  return (
    <OnbornFlow
      flowId="default-onboarding"
      onComplete={() => finishOnboarding()}
      onDismiss={() => closeOnboarding()}
      onEntitlementsChanged={(entitlements) => {
        updatePremiumState(entitlements.some((item) => item.active));
      }}
    />
  );
}
```

`OnbornFlow` may contain onboarding screens and a paywall in one published
journey. Standalone Builder V2 paywalls are delivered through a flow assigned
to the required placement.

### OnbornFlow Props

| Prop | Type | Required | Purpose |
| --- | --- | --- | --- |
| `flowId` | `string` | Yes | Published Builder V2 flow identifier. |
| `initialScreenId` | `string` | No | Opens a specific screen when the artifact contains it. |
| `locale` | `string` | No | Overrides the locale from `Onborn.init` for this flow. |
| `onComplete` | `() => void` | No | Called after the journey completes. |
| `onDismiss` | `() => void` | No | Called when the journey requests dismissal. |
| `onEntitlementsChanged` | `(entitlements) => void` | No | Called after validated purchase or restore changes entitlement state. |
| `renderLoading` | `() => ReactNode` | No | Custom initial loading UI. |
| `renderError` | `(error, retry) => ReactNode` | No | Custom fail-closed error UI with an explicit retry callback. |
| `capabilities` | `OnbornHostCapabilities` | No | Native abilities this app lends to the flow: `notifications`, `camera`, `haptics`. |

### Lending Capabilities

Notifications, camera, and haptics need native modules, config plugins, and
permission strings that belong to the host app, so the SDK carries the app's
implementation rather than bundling one. The host manifest promises the server
exactly the capabilities that arrived in this prop, so a flow requiring one the
app did not lend is never served to that app.

```tsx
import type { OnbornHostCapabilities } from "@onborn/rn-sdk";

const capabilities: OnbornHostCapabilities = {
  haptics: { async trigger(style) { await impact(style); } },
};

<OnbornFlow flowId={flowId} capabilities={capabilities} />;
```

## Artifact Delivery and Offline Behavior

The SDK requests:

```text
GET /runtime/v2/flows/:flowId/artifact?target=ios|android&userId=...&sessionId=...
```

The identity parameters are what an experiment assigns on. Without them the
request is anonymous and a running experiment cannot split traffic.

The response contains release metadata, a signed artifact URL, integrity
metadata, and the artifact signature. Before rendering, the SDK:

1. checks runtime and capability compatibility;
2. downloads the artifact;
3. verifies its SHA-256 integrity;
4. verifies the Ed25519 signature with the embedded trusted public key;
5. validates the UI IR document;
6. stores the verified artifact as the last-known-good release.

An unsigned, modified, incompatible, or invalid artifact is never rendered. If
the network is unavailable, the SDK may use a previously verified compatible
artifact. Without one, `renderError` receives the failure.

## Automatic Analytics

The publication compiler emits signed instrumentation together with UI IR.
The runtime uses only that verified instrumentation to report:

- flow and screen views;
- continue, back, complete, and dismiss navigation;
- declared button and selection interactions;
- paywall views;
- purchase, cancellation, failure, and restore outcomes.

The host app does not add analytics handlers to generated controls. Set
`emitAnalyticsEvents: false` in `Onborn.init` only when automatic runtime
analytics must be disabled.

Use `@onborn/analytics` directly when the app owns all onboarding and paywall
UI and needs standalone product analytics without the renderer.

## Automatic Billing

Builder V2 billing uses the current Onborn offering and the Expo IAP native
store adapter. Generated paywall actions automatically:

1. load the active offering and store products;
2. open the native purchase sheet;
3. submit the transaction to Onborn for validation;
4. finish only a backend-validated purchase;
5. refresh entitlements;
6. report updated entitlements through `onEntitlementsChanged`.

Restore follows the same validation rule. A native success response alone does
not grant premium access.

The host app does not pass:

- `offeringId`;
- `billingAdapter`;
- product IDs;
- receipt validation callbacks.

Use `@onborn/billing` instead of the full renderer when the app owns its custom
paywall UI but still needs Onborn offerings, native purchases, restores, and
entitlements.

## Capability Compatibility

Every artifact declares the capabilities and runtime version it requires. The
SDK declares the capabilities built into the installed version. A release is
rendered only when those sets are compatible.

The first public UI IR runtime supports:

- assets and images;
- safe-area layout;
- localization;
- journey navigation;
- signed analytics instrumentation;
- automatic billing actions;
- host-lent notifications, camera, and haptics, when the app supplies them.

Capabilities are additive and versioned. Unsupported behavior fails before
render instead of being silently ignored.

## Error Handling

Provide a product-specific error state:

```tsx
<OnbornFlow
  flowId="default-onboarding"
  renderError={(error, retry) => (
    <ErrorState
      title="Onboarding is unavailable"
      detail={error.message}
      onRetry={retry}
    />
  )}
/>;
```

Do not unlock premium content from UI callbacks alone. Treat the entitlement
state returned after backend validation as authoritative.

## Beta Environment

Current beta packages use the Onborn testing API internally. Applications do
not configure a base URL. Production packages will switch the internal
production endpoint as part of the release process.
