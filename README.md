# Onborn React Native SDK

Public React Native SDK repository for Onborn onboarding flows, paywalls, and analytics.

## React Native SDK

Render Onborn onboarding flows and paywalls in React Native / Expo apps.

Start with the full SDK documentation:

- [React Native SDK documentation](docs/rn-sdk/rn-sdk.md)

## Standalone Analytics

Use `@onborn/analytics` directly when you want to send Onborn analytics events
without rendering an Onborn flow or paywall.

- [Standalone analytics documentation](docs/rn-sdk/analytics.md)

## Example App

The Expo example app lives in `apps/example-expo` and demonstrates:

- rendering an onboarding flow,
- rendering a standalone paywall,
- mock billing,
- custom loading UI,
- native custom step rendering,
- Lottie animated assets.

```sh
yarn install
yarn workspace @onborn/example-expo start
```

## Contracts

`@onborn/sdk-contracts` contains runtime-safe schemas and types used by the
public SDK packages.

- [SDK contracts documentation](docs/rn-sdk/sdk-contracts.md)
