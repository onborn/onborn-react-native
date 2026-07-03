# RN SDK release readiness

Status: draft audit before first public package release.

Package: `packages/rn-sdk` (`@onborn/rn-sdk`)

## Current state

The SDK already has the core product surface we need for a first beta:

- `SubscriptionFlow` renders published onboarding flows from the backend.
- `SubscriptionPaywall` renders standalone paywalls.
- `useSubscriptionFlow`, `fetchFlow`, `fetchPaywall`, `useOnbornPaywall`, `useOnbornOffering`, and `useOnbornEntitlements` exist.
- Flow configs and paywall payloads are validated with `@onborn/sdk-contracts`, a runtime-safe public contract subset.
- Flow config is cached with `AsyncStorage`.
- Paywalls can use custom billing adapters, RevenueCat, native-store bridge adapters, or the mock adapter.
- Runtime supports targeting context: `platform`, `country`, `appVersion`, and `userType`.
- Runtime supports A/B assignment returned by the backend.
- It tracks core events: flow started/completed, step viewed/completed/skipped, paywall viewed, package selected, purchase started, trial started, purchase failed, restore events, converted events, and legal link taps.
- Demo app exists and uses the SDK.

Current checks:

- `yarn sdk:release-check` passes. It typechecks, lints, builds, and runs `npm pack --dry-run` for `@onborn/sdk-contracts`, `@onborn/analytics`, and `@onborn/rn-sdk`.
- `yarn workspace @onborn/rn-sdk check-types` passes.
- `yarn workspace @onborn/rn-sdk lint` passes.
- `yarn workspace @onborn/analytics check-types` passes.
- `yarn workspace @onborn/analytics lint` passes.
- `yarn workspace @onborn/sdk-contracts check-types` passes.
- `yarn workspace @onborn/sdk-contracts lint` passes.

## Release blockers

### 0. Ownership should move to Onborn-managed accounts before publish

Before the first public npm release, avoid publishing from a personal GitHub or
npm ownership surface.

Recommended setup:

- Create a GitHub organization for Onborn and move the monorepo there.
- Create a public `onborn-react-native` repo for SDK docs, examples, issues,
  and source browsing. Export it from the private monorepo with
  `yarn sdk:export-public-repo`.
- Create an npm organization/user for Onborn and own the `@onborn/*` package
  scope there.
- Publish `@onborn/sdk-contracts`, `@onborn/analytics`, and `@onborn/rn-sdk`
  from the Onborn npm account or org.
- Create CI/npm automation tokens under the Onborn npm owner, not a personal
  user token.
- Restrict package publish rights to owner/admin maintainers.
- Keep repository deployment secrets under the GitHub organization or
  environment-level secrets, not a personal account.

This keeps package provenance, billing, access control, and future team access
clean before beta users start installing the SDK.

### 1. Package manifests are publishable

`packages/rn-sdk`, `packages/analytics`, and `packages/sdk-contracts` now use the public package shape:

- `private: false`
- `main` and `types` point to `dist`
- `exports` expose the public entrypoint
- `files` includes build output and README only
- `publishConfig.access` is public
- public dependencies are pinned to `0.1.0-beta.0`

Current package shape:

```json
{
  "name": "@onborn/rn-sdk",
  "version": "0.1.0-beta.0",
  "private": false,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist", "README.md"],
  "publishConfig": {
    "access": "public"
  }
}
```

### 2. Internal dependencies need a public/private boundary

`@onborn/rn-sdk` imports:

- `@onborn/sdk-contracts`
- `@onborn/analytics`

Both must be available to npm consumers. Publishing only `@onborn/rn-sdk` will not be enough.

Decision:

- `@onborn/analytics` should become public. Users may want analytics without using `SubscriptionFlow`.
- Full `@onborn/contracts` should stay private/internal because it contains broader backend/admin/AI/dashboard contract surface.
- `@onborn/rn-sdk` no longer imports the full internal `@onborn/contracts` package.
- `@onborn/sdk-contracts` has been split out as a publishable runtime-safe contract package.

Recommended release shape:

- `@onborn/analytics@0.1.0-beta.0`
- `@onborn/sdk-contracts@0.1.0-beta.0`
- `@onborn/rn-sdk@0.1.0-beta.0`

`@onborn/sdk-contracts` should contain only runtime-safe public schemas/types. Current status:

- flow/paywall runtime response schemas,
- primitive/runtime types needed by the renderer,
- analytics event schema/types,
- billing request/response types needed by SDK validation,
- no AI schemas,
- no billing provider credential input schemas,
- no dashboard experiment CRUD/result schemas,
- no backend admin schemas.

Keep the full `@onborn/contracts` package private/internal for backend, dashboard,
builder, admin, AI, and template-management contract surface.

Packaging detail:

- `@onborn/sdk-contracts` publishes `dist/**/*.js`, `dist/**/*.d.ts`, and `README.md`.
- Its public entrypoint points to `dist`.
- `@onborn/analytics` and `@onborn/rn-sdk` depend on the built `dist` output of
  earlier packages in the release chain. Run `yarn sdk:release-check` instead of
  raw package typechecks on a clean checkout, because it builds packages in
  dependency order.

### 3. Runtime API URL should be package-owned

`getOnbornApiBaseUrl()` now returns the package-owned beta backend URL:

- `https://api.testing.onborn.app`

Decision:

- Do not expose public `apiBaseUrl`.
- Users should not choose runtime API base URL.
- SDK should be opinionated: user passes `apiKey`, `flowId`, `paywallId`, and runtime context only.

Release behavior:

- beta/testing package can point to `https://api.testing.onborn.app`,
- production package should point to `https://api.onborn.app`,
- local/demo app can still use internal `fetchImpl` while developing, but this should not be documented as a normal customer integration path.

The previous `__DEV__` localhost default has been removed from public package behavior so real-device testing does not accidentally call localhost. Production release should switch this constant to `https://api.onborn.app`.

### 4. Analytics queue is persistent in RN SDK

`@onborn/analytics` still defaults to `MemoryAnalyticsStorage` when used standalone. `@onborn/rn-sdk` now passes an AsyncStorage-backed analytics storage by default, so SDK events survive app restarts.

This area is now beta-ready at the SDK level. Standalone `@onborn/analytics`
still intentionally defaults to memory storage unless a host app passes storage.

### 5. Public documentation needs final release review

`docs/rn-sdk/rn-sdk.md` has been replaced with current `SubscriptionFlow`, `SubscriptionPaywall`, billing adapter, analytics, custom native step, cache, and troubleshooting docs. `packages/rn-sdk/README.md` now exists for npm package publishing.

Before release, review the docs against the final package manifest, final install command, and final testing/prod package-owned API URL strategy.

### 6. Lint must stay clean

The unused `_fullWidth` warning in `selectable.tsx` has been fixed. Release CI
should continue to fail on warnings.

## High-priority improvements before beta

### Packaging and release pipeline

- Add build output generation for SDK, SDK runtime contracts, and analytics. Done for `@onborn/contracts`, `@onborn/sdk-contracts`, `@onborn/analytics`, and `@onborn/rn-sdk`.
- Add package `exports` for public entrypoints only.
- Decide whether deep imports are supported. Default recommendation: avoid deep public imports for beta.
- Add `README.md` inside `packages/rn-sdk`. Done.
- Add package-local `LICENSE`. Done.
- Add package-local `CHANGELOG.md`. Done.
- Add `npm pack --dry-run` check to CI. `yarn sdk:release-check` exists locally.
- Add public repo export check to release flow. `yarn sdk:export-public-repo`
  exists locally and is documented in `docs/rn-sdk/public-repo.md`.
- Current dry-run result:
  - `@onborn/sdk-contracts@0.1.0-beta.0`: 548.0 kB package, 14.7 MB unpacked, 96 files. It packs only `dist`, README, changelog, license, and package manifest. It is large because Zod-inferred declaration files for step schemas are verbose.
  - `@onborn/analytics@0.1.0-beta.0`: 5.0 kB package, 16.4 kB unpacked, 16 files. It packs only `dist`, README, changelog, license, and package manifest.
  - `@onborn/rn-sdk@0.1.0-beta.0`: 96.3 kB package, 495.9 kB unpacked, 178 files. It packs only `dist`, README, changelog, license, and package manifest.
- Release script:
  - typecheck
  - lint
  - build
  - npm pack dry run
- optional future extension: demo app typecheck
- Add semver/versioning policy.

### Public API hardening

- Keep API base URL package-owned and not user-configurable.
- Set beta/testing package API URL to `https://api.testing.onborn.app`.
- Set production package API URL to `https://api.onborn.app`.
- Add `onError` or structured error callback for load failures, invalid config, billing failures, and validation failures.
- Export typed error classes or stable error codes:
  - `config_fetch_failed`
  - `invalid_sdk_key`
  - `invalid_flow_payload`
  - `paywall_fetch_failed`
  - `billing_adapter_missing`
  - `purchase_cancelled`
  - `purchase_failed`
  - `purchase_validation_failed`
  - `restore_failed`
- Expose `source` for `SubscriptionFlow` loading state if useful: `network`, `cache`, `fallback`.
- Add `onReady` callback when first screen is rendered.
- Add `onFlowLoaded` callback with flow metadata and experiment assignment.

### Analytics reliability

- Persist analytics events with `AsyncStorage`. Done in `@onborn/rn-sdk`.
- Add flush-on-background and flush-on-foreground. Done in `@onborn/rn-sdk`.
- Add configurable batch size and max queue size. Max queue size is now supported; batch size already existed.
- Add retry/backoff metadata.
- Track app/session continuation after onboarding if supported by backend.
- Ensure every A/B event includes enough experiment metadata, not just variant where relevant:
  - experiment id
  - variant id
  - variant key/name if available
- Confirm back-rate tracking. Currently navigation callback exists, but analytics should emit a first-class back event if dashboard uses back-rate metrics.
- Confirm close-rate and dismiss semantics for standalone and attached paywalls.

### Flow and paywall runtime behavior

- Add explicit tests for attached paywall placement:
  - paywall after selected step
  - paywall in middle of onboarding
  - close button behavior
  - purchase success continues to next onboarding step
  - skip button behavior when paywall exists later in the flow
- Add explicit tests for quiz answer routing.
- Add explicit tests for loading steps and timed transitions.
- Add explicit tests for `native_custom` missing renderer fallback.
- Add explicit tests for `InitialLoadingComponent`.
- Add explicit tests for `onStartTrial` returning `false`.
- Add explicit tests for purchase cancellation vs error vs pending.

### Rendering fidelity

- Build a parity checklist against Builder/Web Preview for every primitive:
  - title
  - subtitle
  - image
  - animated asset
  - quiz: list, grid, radio-list, checkmark-list
  - features
  - badge
  - testimonial card
  - metric pickers
  - input
  - loading
  - progress bar
  - carousel
  - paywall package selector
  - paywall feature list
  - close button
  - restore purchases
  - terms links
- Add screenshots for iOS and Android demo app.
- Verify hero, hero sheet, split, and content focused layouts on:
  - iPhone small
  - iPhone large
  - Android small
  - Android large
  - tablets if we want to support them
- Verify safe areas on iOS and Android.
- Verify keyboard behavior for input and metric steps.
- Verify accessibility labels for buttons, close, back, restore, package selector, and quiz options.
- Verify Dynamic Type / font scaling policy.
- Verify reduce motion behavior for transitions.

### Asset loading

- Confirm all backend image URLs returned to SDK are stable enough for runtime cache.
- Add a placeholder/error state for failed images.
- Add optional prefetch for first screen and next screen assets.
- Add strategy for expired signed URLs if backend uses signed storage URLs.
- Avoid blank screens when images fail.

### Billing and revenue

- Keep SDK purchase logic thin, but document exactly what host app must provide.
- RevenueCat:
  - document `configureRevenueCatPurchases`
  - document `createRevenueCatBillingAdapter`
  - verify package matching by product id and package id
  - verify sandbox purchase, restore, cancellation, and already-subscribed cases
- Native stores:
  - document bridge shape for `react-native-iap` or custom native module
  - verify local product price localization
  - verify receipt/token validation payloads on iOS and Android
- Add troubleshooting for price fallback issues.
- Add entitlement refresh docs.

### Security and privacy

- Document that SDK API key is public and scoped.
- Ensure SDK never requires service-role or admin secrets.
- Avoid logging sensitive receipt/token payloads in production.
- Add privacy note for analytics:
  - what events are sent
  - what identifiers are sent
  - how to pass a stable `userId`
  - how to disable analytics for previews/internal tools
- Add GDPR deletion implication docs: analytics is keyed by project/user/session on backend.

## Recommended tests before public beta

### Automated

- Unit tests for:
  - `FlowCache`
  - analytics queue
  - fetcher URL construction
  - audience params
  - paywall step injection
  - progress calculation
  - quiz answer routing
  - package selector default selection
  - RevenueCat package matching
  - native-store product localization
- Type tests for public API examples.
- `npm pack --dry-run` artifact test.

### Manual smoke tests

- Expo dev client iOS simulator.
- Expo dev client Android emulator.
- Physical iPhone on testing backend.
- Physical Android on testing backend.
- Flow with:
  - welcome
  - quiz
  - metrics
  - loading
  - benefits
  - social proof
  - attached paywall
- Standalone paywall.
- RevenueCat sandbox paywall.
- Native store sandbox paywall.
- Offline load from cache.
- Invalid SDK key.
- Backend unavailable.
- Missing asset.
- Missing billing adapter.
- Missing native custom renderer.

## Release checklist

### Phase 1: make package publishable

- [x] Fix RN SDK lint warning.
- [x] Add build scripts for `@onborn/analytics`, SDK runtime contracts if separated, and `@onborn/rn-sdk`.
- [x] Update package manifests to use `dist`.
- [x] Add `exports`, `files`, `publishConfig`, and non-private package flags.
- [x] Remove full `@onborn/contracts` from the public RN SDK dependency surface.
- [ ] Publish `@onborn/analytics` publicly.
- [x] Add `@onborn/sdk-contracts` or bundle runtime-safe schemas into `@onborn/rn-sdk`.
- [x] Pin public package versions instead of workspace `*`.
- [x] Add package README.
- [x] Add changelog.
- [x] Add license.
- [x] Run `npm pack --dry-run` and inspect contents.
- [x] Fix package manifests so pack output uses `dist` instead of `src`.

### Phase 2: harden runtime

- [x] Keep API base URL package-owned and not user-configurable.
- [x] Configure beta/testing package API URL as `https://api.testing.onborn.app`.
- [ ] Configure production package API URL as `https://api.onborn.app`.
- [x] Remove public package localhost default behavior.
- [x] Persist RN SDK analytics queue with AsyncStorage.
- [x] Add analytics queue size limits to avoid unbounded local storage.
- [x] Add `AppState` flush behavior.
- [ ] Add structured SDK errors.
- [ ] Add image fallback state.
- [ ] Add first/next screen asset prefetch.
- [ ] Add back/paywall close event coverage if missing on analytics side.

### Phase 3: docs

- [x] Replace stale `docs/rn-sdk/rn-sdk.md`.
- [ ] Add quickstart:
  - install
  - provider dependencies
  - `SubscriptionFlow`
  - `SubscriptionPaywall`
  - `InitialLoadingComponent`
  - `RevenueCat`
  - native stores
  - custom step renderer
  - analytics opt-out
  - testing/staging backend URL
- [ ] Add troubleshooting:
  - prices show fallback
  - flow returns 404
  - image does not render
  - paywall does not continue after purchase
  - RevenueCat package not found
  - cache shows old flow

### Phase 4: beta validation

- [x] Run typecheck/lint/build/pack dry run for SDK release packages with `yarn sdk:release-check`.
- [ ] Run demo app on iOS simulator.
- [ ] Run demo app on Android emulator.
- [ ] Run demo app on a physical iPhone.
- [ ] Run demo app on a physical Android device.
- [ ] Validate test environment API URL.
- [ ] Validate SDK API key permissions.
- [ ] Validate analytics appears in Insights/Analytics.
- [ ] Validate RevenueCat sandbox.
- [ ] Validate native-store sandbox if supported for beta.

### Phase 5: publish

- [ ] Create Onborn GitHub organization or transfer repository under the Onborn organization.
- [ ] Create public `onborn-react-native` SDK repository under the Onborn organization.
- [ ] Export public SDK repo with `yarn sdk:export-public-repo`.
- [ ] Run `yarn sdk:release-check` inside the exported public SDK repo.
- [ ] Create Onborn npm owner/org and verify ownership of the `@onborn` scope.
- [ ] Configure npm automation token under the Onborn owner/org.
- [ ] Publish `@onborn/sdk-contracts` if runtime contracts are kept as a separate package.
- [ ] Publish `@onborn/analytics`.
- [ ] Publish `@onborn/rn-sdk`.
- [ ] Install published package into demo app from npm, not workspace.
- [ ] Run demo app again.
- [ ] Tag release in git.
- [ ] Add release notes.

## Suggested beta scope

Do not try to make every advanced feature perfect before the first beta. The beta should prove:

- published flow can load on a real app,
- assets render,
- paywall renders,
- prices localize through adapter,
- purchase/restore callbacks work,
- backend validates purchase,
- analytics appears in dashboard,
- A/B assignment is stable enough for testing,
- fallback/cache behavior is acceptable.

Everything else can be marked as beta limitation if documented clearly.

## Immediate next actions

1. Convert package manifests from workspace/private shape to publishable shape.
2. Publish analytics and `@onborn/sdk-contracts`; keep full `@onborn/contracts` out of the public dependency surface.
3. Review the new RN SDK docs against the final publishable manifest.
4. Add an `npm pack --dry-run` release check.
