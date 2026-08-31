# Changelog

## 0.7.0-beta.1

- The UI IR analytics bridge stamps every event with the session's experiment assignment and reports `experiment_exposed` once, at journey start.
- Synced instrumentation and runtime mapping with the platform.

## 0.2.0-beta.1

**Breaking: every analytics event must carry a flow name.**

- `flowName` is now a required field on every event. The dashboard shows analytics
  sources by name, so a source that can only be rendered as a uuid is a source nobody
  can reason about.
- Added `onboardingFlowName` and `paywallName` to `Onborn.init` / `Onborn.initAsync`.
  Flow and step events report `onboardingFlowName`; every `paywall_*` event reports
  `paywallName`.
- Individual events may override the configured name with `flowName`, for apps that run
  more than one flow.
- Tracking an event with no name available throws `OnbornMissingFlowNameError`, and the
  backend rejects unnamed events. There is no compatibility path: upgrade the SDK and set
  the names, or events stop being accepted.

## 0.1.0-beta.3

- `sdkVersion` now defaults to this package's real version instead of a hardcoded `"0.1.0"`. Apps no longer need to pass (and hand-sync) it; a stale hand-passed value used to be reported with every event.
- Added `Onborn.initAsync`: resolves a **persisted** anonymous user id via `analyticsStorage`. `Onborn.init` generates an in-memory id, so every cold start looked like a new user; `initAsync` keeps one identity per device. Storage failures fall back to an ephemeral id instead of blocking startup.
- Exported `ONBORN_SDK_VERSION`.

## 0.1.0-beta.2

- Share one normalized runtime identity across analytics, billing, and the renderer after `Onborn.init`.
- Generate an anonymous runtime user ID when the app does not provide one.
- Clean `dist` before each package build.

## 0.1.0-beta.1

- Replaced the public client factory with the shared `Onborn.init` runtime.
- Added `Onborn.track`, `Onborn.flush`, and queue lifecycle methods.
- Added optional global `userId` injection for standalone analytics events.

## 0.1.0-beta.0

Initial beta release candidate.

- Added standalone Onborn analytics client.
- Added configurable transport, batching, flush, and storage hooks.
- Added typed event payloads through `@onborn/sdk-contracts`.
