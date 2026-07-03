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

## Install

```sh
yarn add @onborn/rn-sdk
yarn add react-native-safe-area-context react-native-svg react-native-reanimated react-native-worklets
yarn add expo-font expo-image expo-linear-gradient expo-localization expo-store-review expo-video
```

Optional:

```sh
yarn add lottie-react-native
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

ONBORN renders the paywall UI. The host app provides billing.

```tsx
import { createRevenueCatBillingAdapter } from "@onborn/rn-sdk";
import Purchases from "react-native-purchases";

const billingAdapter = createRevenueCatBillingAdapter({
  purchases: Purchases,
});

<SubscriptionFlow
  apiKey={apiKey}
  flowId={flowId}
  billingAdapter={billingAdapter}
/>;
```

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

## Docs

Full docs live in:

```text
docs/rn-sdk/rn-sdk.md
```

Release readiness checklist:

```text
docs/rn-sdk/release-readiness.md
```
