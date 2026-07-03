# @onborn/analytics

Analytics client used by Onborn SDKs.

This package can be used directly when an app wants to send Onborn analytics
events without rendering an Onborn subscription flow.

```ts
import { createAnalyticsClient } from "@onborn/analytics";

const analytics = createAnalyticsClient({
  baseUrl: "https://api.testing.onborn.app",
  apiKey: process.env.EXPO_PUBLIC_ONBORN_SDK_API_KEY!,
  appId: "my-ios-app",
  platform: "ios",
  appVersion: "1.0.0",
  sdkVersion: "0.1.0-beta.0",
});

await analytics.track({
  type: "flow_started",
  flowId: "default-onboarding",
  sessionId: "session-123",
  userId: "user-123",
});

await analytics.flush();
```

The React Native SDK configures persistent queue storage automatically. When
using this package directly, provide your own `storage` implementation if events
should survive app restarts.

## Documentation

- [Analytics docs](../../docs/rn-sdk/analytics.md)
- [React Native SDK docs](../../docs/rn-sdk/rn-sdk.md)
- [SDK contracts docs](../../docs/rn-sdk/sdk-contracts.md)
