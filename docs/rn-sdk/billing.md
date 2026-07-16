# Onborn Headless Billing

Use `@onborn/billing` when your app owns its onboarding and paywall UI but
Onborn should manage offerings, purchase validation, restores, entitlements,
and billing analytics.

You do not need to install `@onborn/rn-sdk`, create a builder funnel, or render
an Onborn paywall. You do need an Onborn project, an SDK API key, and billing
catalog entries for any offering or paywall you load.

## Install

```sh
yarn add @onborn/billing expo-iap
```

The package installs `@onborn/analytics` and `@onborn/sdk-contracts` as
dependencies. `expo-iap` is an optional peer dependency used by the official
Expo adapter. It requires an Expo development build; Expo Go does not include
the native purchase module.

## Initialize once

```ts
import { Onborn } from "@onborn/billing";

Onborn.init({
  apiKey: process.env.EXPO_PUBLIC_ONBORN_SDK_API_KEY!,
  userId: currentUser.id,
  appId: "my-mobile-app",
  platform: "ios",
  locale: "en",
  appVersion: "1.0.0",
});
```

The API URL is package-owned. Hooks and clients do not accept an `apiKey`,
`userId`, or backend URL. They read the same singleton configured by
`Onborn.init`.

## Choose the right runtime

| App architecture | Install | UI owner |
| --- | --- | --- |
| Custom onboarding/paywall with Onborn analytics and billing | `@onborn/billing` | Your app |
| Custom analytics only | `@onborn/analytics` | Your app |
| Onborn builder flow or paywall renderer | `@onborn/rn-sdk` | Onborn SDK |

## Read entitlements

```tsx
import { useOnbornEntitlements } from "@onborn/billing";

export function PremiumGate() {
  const { data, loading, error, hasEntitlement, reload } =
    useOnbornEntitlements();

  if (loading) return <Loading />;
  if (error) return <Retry onPress={reload} />;

  return hasEntitlement("premium") ? <PremiumApp /> : <UpgradeScreen />;
}
```

### `useOnbornEntitlements` options

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `autoLoad` | `boolean` | `true` | Fetch entitlements on mount. |

### Returned state

| Field | Type | Description |
| --- | --- | --- |
| `data` | `CustomerEntitlementsResponse \| null` | Latest server entitlement state. |
| `loading` | `boolean` | Initial or manual refresh state. |
| `error` | `string \| null` | Safe request error message. |
| `reload()` | `Promise<CustomerEntitlementsResponse>` | Refetches the initialized user. |
| `hasEntitlement(keyOrId)` | `boolean` | Checks an active entitlement by key or id. |

## Load an offering for custom UI

```tsx
import { useOnbornOffering } from "@onborn/billing";
import { useExpoIapBillingAdapter } from "@onborn/billing/expo-iap";

export function UpgradeScreen() {
  const store = useExpoIapBillingAdapter();
  const billing = useOnbornOffering({
    billingAdapter: store.billingAdapter,
    onEntitlementsChanged(entitlements) {
      updateLocalAccess(entitlements);
    },
  });

  return (
    <CustomPaywall
      packages={billing.packages}
      selectedPackageId={billing.selectedPackageId}
      onSelectPackage={billing.selectPackage}
      onPurchase={() => billing.purchasePackage()}
      onRestore={billing.restorePurchases}
      loading={!store.connected || billing.loading || billing.purchasing}
      error={billing.error ?? store.productError?.message ?? null}
    />
  );
}
```

The adapter reads store product identifiers from the current Onborn offering.
Use `productIds` only for additional app-specific SKUs that are not part of
that offering.

```tsx
const store = useExpoIapBillingAdapter({
  productIds: ["com.example.special_offer"],
});
```

After a native purchase, `useOnbornOffering` sends store evidence to Onborn,
waits for server validation, updates entitlements, and asks the adapter to
finish the transaction. Restore follows the same order: synchronize StoreKit
or Google Play, reconcile with Onborn, then finish restored transactions. The
host app must not call `finishTransaction` itself.

## Load a configured paywall without rendering it

`useOnbornPaywall` returns paywall metadata, its offering, localized products,
selection state, purchase actions, and entitlement callbacks. Your app decides
how to render every element.

```tsx
import { useOnbornPaywall } from "@onborn/billing";

const paywall = useOnbornPaywall({
  paywallId: "main-paywall",
  billingAdapter,
  onStartTrial(item) {
    analytics.track("trial_selected", { packageId: item.package.id });
  },
  onPurchaseCompleted(result) {
    closePaywall(result.entitlements);
  },
});
```

### Shared hook callbacks

| Callback | Description |
| --- | --- |
| `onPurchaseStarted(item)` | Native purchase is about to start. |
| `onPurchaseCompleted(result)` | Store evidence was validated by Onborn. |
| `onPurchaseFailed(error)` | Purchase, store, or validation failed. |
| `onRestoreCompleted(result)` | Restore was validated and entitlements refreshed. |
| `onRestoreFailed(error)` | Restore failed. |
| `onEntitlementsChanged(entitlements)` | Current server entitlements changed. |

`useOnbornPaywall` additionally supports `onStartTrial`. Return `false` from
that callback to stop the purchase flow.

## Native-store adapter

`createNativeStoresBillingAdapter` bridges Onborn to StoreKit, Google Play
Billing, `expo-iap`, `react-native-iap`, or a custom native purchase module.

| Option | Required | Description |
| --- | --- | --- |
| `loadProducts` | No | Returns localized product title, description, price, currency, and period. |
| `purchaseProduct` | Yes | Opens the native purchase sheet and returns transaction evidence. |
| `restorePurchases` | For restore UI | Returns restored App Store or Google Play purchases. |
| `finalizePurchase` | No | Finishes a purchase after Onborn validates it. The official Expo adapter implements this automatically. |
| `finalizeRestore` | No | Finishes restored transactions after Onborn reconciliation. The official Expo adapter implements this automatically. |
| `refetchCustomerEntitlements` | No | Optional host-side refresh before Onborn entitlement reload. |

Return transaction identifiers, purchase tokens, receipts, and raw store data
when available. Onborn validates the result server-side; a successful native
purchase alone must not unlock premium access.

## RevenueCat adapter

Use `createRevenueCatBillingAdapter` only when the app already uses RevenueCat
or is migrating gradually.

```ts
import { createRevenueCatBillingAdapter } from "@onborn/billing";
import Purchases from "react-native-purchases";

const billingAdapter = createRevenueCatBillingAdapter({
  purchases: Purchases,
});
```

The adapter identifies the user, maps Onborn packages to RevenueCat packages,
purchases, restores, and forwards active entitlement/product identifiers to
Onborn validation.

## Low-level client

Most apps should use hooks. Non-React modules can create a client from the
already initialized singleton:

```ts
import { Onborn, createBillingClient } from "@onborn/billing";

Onborn.init({ apiKey, userId, platform: "ios", appVersion: "1.0.0" });

const client = createBillingClient({ sourceId: "custom-paywall" });
const entitlements = await client.loadCustomerEntitlements();
```

`BillingClient` supports `loadPaywall`, `loadOffering`, `validatePurchase`,
`restorePurchases`, `loadCustomerEntitlements`, billing event helpers, and
`flushEvents`.

`loadOffering()` accepts no identifier. It loads only the offering marked
**Current** in Dashboard → Billing for the API key environment. If no current
offering is configured, the backend returns
`current_offering_not_configured` instead of selecting an arbitrary offering.

## Identity and security

- Use the same stable `userId` in `Onborn.init`, your native billing provider,
  and your backend.
- SDK API keys are public mobile credentials. Never embed a server entitlement
  key or provider secret in the app.
- Unlock access from validated Onborn entitlements, not directly from a native
  purchase callback.
- Use server entitlement checks or webhooks for backend authorization.
- Keep test and production keys, products, and entitlements separate.

## Related docs

- [Standalone analytics](./analytics.md)
- [Full React Native SDK](./rn-sdk.md)
- [SDK contracts](./sdk-contracts.md)
