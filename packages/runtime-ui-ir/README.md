# Onborn UI IR Runtime

Platform-independent runtime for verified Onborn UI IR artifacts.

This package validates signed artifacts, checks host capabilities, manages
journey state, and executes declared actions. Most applications should not
install it directly. Use `@onborn/rn-sdk`, which configures the trusted keys,
delivery endpoint, analytics, billing, and native renderer.

## Security boundary

The runtime rejects artifacts when the signature, file hashes, identity hash,
manifest hash, compatibility declaration, or release scope is invalid. It may
use only a previously verified last-known-good artifact.

## Supported entry points

- `@onborn/runtime-ui-ir`
- `@onborn/runtime-ui-ir/actions`
- `@onborn/runtime-ui-ir/artifact`
- `@onborn/runtime-ui-ir/react`

These entry points exist for Onborn runtime adapters. They are not a
replacement for the public React Native SDK.
