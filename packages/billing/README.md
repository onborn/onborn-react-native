# @onborn/billing

Headless Onborn billing for apps that own their onboarding and paywall UI.

It provides offering and paywall data, native-store adapters, purchase and
restore validation, and entitlement state without installing the Onborn UI
renderer.

```ts
import { Onborn, useOnbornEntitlements } from "@onborn/billing";
import { useExpoIapBillingAdapter } from "@onborn/billing/expo-iap";

Onborn.init({
  apiKey: "onborn_test_...",
  userId: "customer_123",
  appVersion: "1.0.0",
  platform: "ios",
});

function PremiumGate() {
  const { hasEntitlement, loading } = useOnbornEntitlements();
  return { loading, premium: hasEntitlement("premium") };
}

function CustomPaywall() {
  const { billingAdapter, connected } = useExpoIapBillingAdapter();
  // Pass billingAdapter to useOnbornOffering or useOnbornPaywall.
  return { billingAdapter, connected };
}
```

The optional `@onborn/billing/expo-iap` adapter owns the complete native-store
lifecycle: connection callbacks, localized product loading and retries,
serialized purchases, cancellation recovery, StoreKit restore synchronization,
server validation hand-off, and transaction finishing. Host apps keep only
their paywall UI and entitlement-driven navigation.

The package owns the Onborn API URL. Configure credentials and user context
once through `Onborn.init`; hooks and adapters do not accept an API key.

`useOnbornOffering()` and `BillingClient.loadOffering()` always load the
offering marked **Current** for the active project and environment. The public
API accepts no offering ID. Select the current offering in Dashboard → Billing
before loading a custom paywall.

Installing `@onborn/billing` also installs its analytics and public-contract
dependencies. You do not need `@onborn/rn-sdk` unless you render Onborn-built
flows or paywalls.

Expo apps using the official adapter must also install the optional peer
dependency `expo-iap` and use an Expo development build. Expo Go does not
contain this native module.

`@onborn/rn-sdk` re-exports this package for apps that render Onborn flows.

## Documentation

- [Headless billing](../../docs/rn-sdk/billing.md)
- [Standalone analytics](../../docs/rn-sdk/analytics.md)
- [Full React Native SDK](../../docs/rn-sdk/rn-sdk.md)
