# Onborn Analytics

`@onborn/analytics` is the standalone analytics client used by Onborn SDKs.
Use it directly when an app wants to send Onborn analytics events without
rendering an onboarding flow or paywall through `@onborn/rn-sdk`.

Standalone analytics does not require an Onborn funnel or paywall. Create an
Onborn project/app, use its SDK API key, and initialize analytics directly.
Events still require a stable logical `flowId`, such as `app-lifecycle`, to
group sessions and metrics. That id does not need to reference a funnel created
in the Onborn builder.

## Install

```sh
yarn add @onborn/analytics
```

## Initialize once

```ts
import { Onborn } from "@onborn/analytics";

Onborn.init({
  apiKey: process.env.EXPO_PUBLIC_ONBORN_SDK_API_KEY!,
  userId: "user-123",
  appId: "ios-app",
  platform: "ios",
  appVersion: "1.0.0",
  sdkVersion: "0.1.0-beta.1",
});
```

The Onborn API URL is package-owned. Apps provide an SDK API key and runtime
context, not a backend URL.

## Track an event

```ts
await Onborn.track({
  type: "flow_started",
  flowId: "app-lifecycle",
  sessionId: "session-123",
});

await Onborn.flush();
```

## Queue behavior

Events are queued and flushed in batches.

```ts
Onborn.init({
  apiKey,
  userId,
  appId: "ios-app",
  platform: "ios",
  appVersion: "1.0.0",
  sdkVersion: "0.1.0-beta.1",
  maxAnalyticsBatchSize: 10,
  autoFlushMs: 10_000,
  maxAnalyticsQueueSize: 500,
});
```

The standalone package defaults to memory storage. If events should survive app
restarts, provide a storage implementation.

## Persistent storage

```ts
import type { AnalyticsStorage } from "@onborn/analytics";

const storage: AnalyticsStorage = {
  async getItem(key) {
    return await MyStorage.get(key);
  },
  async setItem(key, value) {
    await MyStorage.set(key, value);
  },
  async removeItem(key) {
    await MyStorage.remove(key);
  },
};

Onborn.init({
  apiKey,
  userId,
  appId,
  platform: "ios",
  appVersion,
  sdkVersion,
  analyticsStorage: storage,
});
```

`@onborn/rn-sdk` configures AsyncStorage-backed analytics storage automatically.
You only need to pass storage when using `@onborn/analytics` directly.

## Common event types

The event union is exported from `@onborn/sdk-contracts` and includes:

- `flow_started`
- `step_viewed`
- `step_completed`
- `step_skipped`
- `flow_completed`
- `paywall_viewed`
- `paywall_dismissed`
- `paywall_package_selected`
- `paywall_link_pressed`
- `paywall_purchase_started`
- `paywall_trial_started`
- `paywall_purchase_failed`
- `paywall_converted`
- `paywall_restore_started`
- `paywall_restore_completed`
- `paywall_restore_failed`
- `sdk_connection_established`

Question answers are stored on `step_completed.answer`; the SDK does not emit a
separate quiz-answer event.

Use stable `sessionId` values so Onborn can connect events into a funnel.

Every event includes the same base context: `eventId`, `flowId`, `sessionId`,
`userId`, `appId`, `timestamp`, `platform`, `appVersion`, `sdkVersion`, optional
`locale`, `country`, `userType`, and optional experiment fields
`experimentId`, `experimentVariantId`, and `experimentAssignmentId`.

Paywall lifecycle events also include paywall context. When you track these
manually, include `stepId` and `paywallTemplate`; include `paywallId` when a
published paywall id is available. Package/purchase events should include
`packageId` and `productId` when known.

## Dashboard metric definitions

Onborn uses session-based counts where possible so duplicate flushes or reloads
do not inflate conversion rates. The raw event stream still shows every accepted
event for debugging.

| Metric | Definition | Source events |
| --- | --- | --- |
| Funnel starts | Unique sessions that started a flow. | `flow_started` |
| Completed onboarding count | Unique sessions that completed a flow. | `flow_completed` |
| Onboarding completion rate | Completed sessions divided by funnel starts. | `flow_started`, `flow_completed` |
| Step continue rate | Sessions completing a step divided by sessions viewing it. | `step_viewed`, `step_completed` |
| Step drop-off rate | Sessions viewing a step but not completing it divided by sessions viewing it. | `step_viewed`, `step_completed` |
| Average time per step | Average `timeSpentMs` for completed step events. | `step_completed.timeSpentMs` |
| Answer distribution | Counts and percentages of answers selected on quiz/input/metrics steps. | `step_completed.answer` |
| Paywall view rate | Sessions reaching a paywall divided by funnel starts. | `flow_started`, `paywall_viewed` |
| Trial start rate | Sessions with trial intent divided by paywall views. | `paywall_viewed`, `paywall_trial_started` |
| Purchase tap rate | Sessions tapping purchase divided by paywall views. | `paywall_viewed`, `paywall_purchase_started` |
| Purchase success rate | Converted purchase sessions divided by purchase-start sessions. | `paywall_purchase_started`, `paywall_converted` |
| Close rate | Sessions dismissing a paywall divided by paywall views. | `paywall_viewed`, `paywall_dismissed` |
| Revenue per view | Revenue divided by paywall views. | `paywall_viewed`, `paywall_converted` |

Revenue cards require purchase validation or provider lifecycle data with price
and currency information. If you manually track standalone paywalls, include
`productId`, `packageId`, and `priceUsd` when known.

## Standalone paywall sequence

If you render your own paywall and only use Onborn analytics, emit the same
sequence that `@onborn/rn-sdk` would emit:

```ts
const common = {
  flowId: "paywall:main",
  sessionId: "session-123",
  stepId: "paywall:main:screen",
  paywallId: "main-paywall",
  paywallTemplate: "Main paywall",
};

await Onborn.track({ ...common, type: "paywall_viewed" });
await Onborn.track({
  ...common,
  type: "paywall_package_selected",
  packageId: "annual",
  productId: "com.app.annual",
});
await Onborn.track({
  ...common,
  type: "paywall_purchase_started",
  packageId: "annual",
  productId: "com.app.annual",
});
await Onborn.track({
  ...common,
  type: "paywall_converted",
  productId: "com.app.annual",
  priceUsd: 59.99,
});
```

## Error handling

`track()` queues locally. `flush()` sends queued events to Onborn and returns a
summary of attempted, sent, failed, and remaining events.

```ts
const summary = await Onborn.flush();

if (summary.remaining > 0) {
  console.warn("Some Onborn analytics events are still queued", summary);
}
```

## Privacy

Do not send sensitive personal data in custom event properties. Use stable,
application-level user identifiers where possible.

## Related docs

- [React Native SDK](./rn-sdk.md)
- [SDK contracts](./sdk-contracts.md)
