# Onborn Analytics

`@onborn/analytics` is the standalone analytics client used by Onborn SDKs.
Use it directly when an app wants to send Onborn analytics events without
rendering an onboarding flow or paywall through `@onborn/rn-sdk`.

## Install

```sh
yarn add @onborn/analytics
```

## Create a client

```ts
import { createAnalyticsClient } from "@onborn/analytics";

const analytics = createAnalyticsClient({
  apiKey: process.env.EXPO_PUBLIC_ONBORN_SDK_API_KEY!,
  appId: "ios-app",
  platform: "ios",
  appVersion: "1.0.0",
  sdkVersion: "0.1.0-beta.0",
});
```

The Onborn API URL is package-owned. Apps provide an SDK API key and runtime
context, not a backend URL.

## Track an event

```ts
await analytics.track({
  type: "flow_started",
  flowId: "main-onboarding",
  sessionId: "session-123",
  userId: "user-123",
});

await analytics.flush();
```

## Queue behavior

Events are queued and flushed in batches.

```ts
const analytics = createAnalyticsClient({
  apiKey,
  appId: "ios-app",
  platform: "ios",
  appVersion: "1.0.0",
  sdkVersion: "0.1.0-beta.0",
  maxBatchSize: 10,
  autoFlushMs: 10_000,
  maxQueueSize: 500,
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

const analytics = createAnalyticsClient({
  apiKey,
  appId,
  platform: "ios",
  appVersion,
  sdkVersion,
  storage,
});
```

`@onborn/rn-sdk` configures AsyncStorage-backed analytics storage automatically.
You only need to pass storage when using `@onborn/analytics` directly.

## Common event types

The event union is exported from `@onborn/sdk-contracts` and includes:

- `flow_started`
- `flow_completed`
- `step_viewed`
- `step_completed`
- `step_skipped`
- `quiz_answered`
- `paywall_viewed`
- `paywall_closed`
- `package_selected`
- `purchase_started`
- `trial_started`
- `purchase_failed`
- `purchase_converted`
- `restore_started`
- `restore_completed`
- `legal_link_opened`

Use stable `sessionId` values so Onborn can connect events into a funnel.

## Error handling

`track()` queues locally. `flush()` sends queued events to Onborn and returns a
summary of attempted, sent, failed, and remaining events.

```ts
const summary = await analytics.flush();

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
