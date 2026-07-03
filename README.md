# Onborn React Native SDK

Public React Native SDK repository for Onborn onboarding flows, paywalls, and analytics.

## Packages

- `@onborn/rn-sdk` renders onboarding flows and paywalls in React Native / Expo apps.
- `@onborn/analytics` sends Onborn analytics events without rendering a flow.
- `@onborn/sdk-contracts` contains runtime-safe schemas and types used by the public SDK packages.

## Example

The Expo example app lives in `apps/example-expo`.

```sh
yarn install
yarn workspace @onborn/example-expo start
```

## Release checks

```sh
yarn sdk:release-check
```

## Documentation

- [React Native SDK](docs/rn-sdk/rn-sdk.md)
- [Analytics](docs/rn-sdk/analytics.md)
- [SDK contracts](docs/rn-sdk/sdk-contracts.md)
- [Release readiness](docs/rn-sdk/release-readiness.md)
