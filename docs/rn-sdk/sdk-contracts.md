# Onborn SDK Contracts

`@onborn/sdk-contracts` contains the runtime-safe schemas and TypeScript types
used by public Onborn SDK packages.

It is intentionally smaller than Onborn's internal contract package. It should
only include data shapes needed by customer apps and public SDK runtime code.

## Install

Most apps do not need to install this package directly. It is installed as a
dependency of:

- `@onborn/rn-sdk`
- `@onborn/analytics`
- `@onborn/billing`

Install it directly only when you need shared Onborn runtime types:

```sh
yarn add @onborn/sdk-contracts
```

## What is included

The public contract surface includes:

- flow runtime response schemas and types,
- paywall runtime response schemas and types,
- primitive schemas used by the renderer,
- theme schemas,
- translation payload schemas,
- analytics event schemas,
- billing runtime request/response schemas,
- runtime experiment assignment schemas.

## What is excluded

This package must not expose:

- backend admin contracts,
- dashboard CRUD contracts,
- builder/session internals,
- AI assistant contracts,
- provider credential input schemas,
- template-management contracts,
- private migration or operational types.

## Runtime validation

The React Native SDK validates backend payloads before rendering.

```ts
import { GetFlowResponseSchema } from "@onborn/sdk-contracts";

const parsed = GetFlowResponseSchema.safeParse(payload);

if (!parsed.success) {
  throw new Error("Invalid Onborn flow payload");
}
```

## Type-only usage

```ts
import type {
  FlowConfig,
  PaywallConfig,
  AnalyticsEvent,
  RuntimeExperimentAssignment,
} from "@onborn/sdk-contracts";
```

## Billing types

The SDK contracts package exposes billing runtime types, not provider credential
schemas.

```ts
import type {
  BillingOffering,
  BillingPackage,
  BillingProduct,
  CustomerEntitlement,
} from "@onborn/sdk-contracts";
```

Provider credentials belong to Onborn backend configuration and are not part of
the public SDK contract.

## Versioning

Public packages should be released in dependency order during beta.

Recommended beta publish order:

1. `@onborn/sdk-contracts`
2. `@onborn/analytics`
3. `@onborn/billing`
4. `@onborn/rn-sdk`

## Related docs

- [React Native SDK](./rn-sdk.md)
- [Analytics](./analytics.md)
- [Headless billing](./billing.md)
