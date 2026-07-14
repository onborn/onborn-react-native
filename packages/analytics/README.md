# @onborn/analytics

Standalone analytics runtime used by Onborn SDKs.

This package can be used directly when an app wants to send Onborn analytics
events without rendering an Onborn subscription flow or paywall. You only need
an Onborn project/app and its SDK API key; creating a funnel or paywall is not
required. Events still use a stable logical `flowId` (for example,
`app-lifecycle`) as their analytics namespace. It does not need to reference a
flow created in the Onborn builder.

```ts
import { Onborn } from "@onborn/analytics";

Onborn.init({
  apiKey: process.env.EXPO_PUBLIC_ONBORN_SDK_API_KEY!,
  userId: "user-123",
  appId: "my-ios-app",
  platform: "ios",
  appVersion: "1.0.0",
  sdkVersion: "0.1.0-beta.1",
});

await Onborn.track({
  type: "flow_started",
  flowId: "app-lifecycle",
  sessionId: "session-123",
});

await Onborn.flush();
```

The React Native SDK configures persistent queue storage automatically. When
using this package directly, provide `analyticsStorage` in `Onborn.init` if
events should survive app restarts.

The Onborn API URL is package-owned. Apps provide an SDK API key and runtime
context, not a backend URL.

## Documentation

- [Analytics docs](../../docs/rn-sdk/analytics.md)
- [React Native SDK docs](../../docs/rn-sdk/rn-sdk.md)
- [SDK contracts docs](../../docs/rn-sdk/sdk-contracts.md)
