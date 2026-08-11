# Onborn Expo UI IR Runtime

Expo and React Native adapter for the verified Onborn UI IR runtime.

It renders supported native UI IR nodes, resolves signed assets, persists the
last-known-good artifact, and connects navigation, analytics, billing, and host
capabilities. Applications should normally install `@onborn/rn-sdk` instead of
using this package directly.

## Host requirements

- React Native 0.81 or newer
- Expo FileSystem 19 or newer

The public `OnbornFlow` component supplies the delivery client, trusted signing
keys, analytics bridge, native billing adapter, and host manifest.
