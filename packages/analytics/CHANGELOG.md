# Changelog

## 0.1.0-beta.1

- Replaced the public client factory with the shared `Onborn.init` runtime.
- Added `Onborn.track`, `Onborn.flush`, and queue lifecycle methods.
- Added optional global `userId` injection for standalone analytics events.

## 0.1.0-beta.0

Initial beta release candidate.

- Added standalone Onborn analytics client.
- Added configurable transport, batching, flush, and storage hooks.
- Added typed event payloads through `@onborn/sdk-contracts`.
