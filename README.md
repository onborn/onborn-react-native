# Onborn React Native SDK

Public React Native SDK repository for Onborn onboarding flows, paywalls, and analytics.

## React Native SDK

Render signed Onborn Builder V2 flows and paywalls in React Native / Expo apps.
The full SDK owns artifact verification, analytics, native billing, restores,
and entitlements.

Start with the full SDK documentation:

- [React Native SDK documentation](docs/rn-sdk/rn-sdk.md)

## Standalone Analytics

Use `@onborn/analytics` directly when you want to send Onborn analytics events
without rendering an Onborn flow or paywall.

- [Standalone analytics documentation](docs/rn-sdk/analytics.md)

## Headless Billing

Use `@onborn/billing` when your app owns the onboarding and paywall UI but
Onborn should manage offerings, purchase validation, restores, and
entitlements.

- [Headless billing documentation](docs/rn-sdk/billing.md)

## Example App

The Expo example app in `apps/example-expo` remains a legacy V1 compatibility
fixture while the Builder V2 release-candidate host is prepared. New
integrations should follow the `OnbornFlow` quick start above.

It demonstrates the APIs kept during the V1 compatibility window:

- `SubscriptionFlow` and `SubscriptionPaywall`;
- custom loading UI;
- native custom-step rendering;
- optional Lottie assets.

```sh
yarn install
yarn workspace @onborn/example-expo start
```

## Contracts

`@onborn/sdk-contracts` contains runtime-safe schemas and types used by the
public SDK packages.

- [SDK contracts documentation](docs/rn-sdk/sdk-contracts.md)
