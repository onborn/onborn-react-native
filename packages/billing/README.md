# @onborn/billing

Headless Onborn billing for apps that own their onboarding and paywall UI.

It provides offering and paywall data, native-store adapters, purchase and
restore validation, and entitlement state without installing the Onborn UI
renderer.

```ts
import {
  Onborn,
  createNativeStoresBillingAdapter,
  useOnbornEntitlements,
} from "@onborn/billing";

Onborn.init({
  apiKey: "onborn_test_...",
  userId: "customer_123",
  appVersion: "1.0.0",
  platform: "ios",
});

const billingAdapter = createNativeStoresBillingAdapter({
  purchaseProduct: async ({ storeProductId }) => {
    // Call expo-iap, react-native-iap, or your native purchase module.
    return { productId: storeProductId };
  },
});

function PremiumGate() {
  const { hasEntitlement, loading } = useOnbornEntitlements();
  return { loading, premium: hasEntitlement("premium") };
}
```

The package owns the Onborn API URL. Configure credentials and user context
once through `Onborn.init`; hooks and adapters do not accept an API key.

Installing `@onborn/billing` also installs its analytics and public-contract
dependencies. You do not need `@onborn/rn-sdk` unless you render Onborn-built
flows or paywalls.

`@onborn/rn-sdk` re-exports this package for apps that render Onborn flows.

## Documentation

- [Headless billing](../../docs/rn-sdk/billing.md)
- [Standalone analytics](../../docs/rn-sdk/analytics.md)
- [Full React Native SDK](../../docs/rn-sdk/rn-sdk.md)
