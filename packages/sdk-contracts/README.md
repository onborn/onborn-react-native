# @onborn/sdk-contracts

Runtime-safe schemas and types used by public Onborn SDK packages.

This package intentionally exposes only the contract surface needed by client
SDKs:

- flow and paywall runtime payloads,
- primitive and theme types required by renderers,
- analytics event payloads,
- billing runtime request/response payloads,
- runtime experiment assignment payloads.

It must not expose backend, dashboard, builder, AI, provider credential, or
template-management contracts. Keep those in private internal workspace
packages.

## Documentation

- [SDK contracts docs](../../docs/rn-sdk/sdk-contracts.md)
- [React Native SDK docs](../../docs/rn-sdk/rn-sdk.md)
- [Analytics docs](../../docs/rn-sdk/analytics.md)
