# Changelog

## 0.8.0-beta.2

- Added the `switch` UI IR node.
- `billing.samplePlans` on a paywall screen carries the designed plans into the artifact, for a device that cannot load any offering.
- Web target renders `switch`.

## 0.8.0-beta.1

- Added the `ruler-picker` UI IR node: a draggable ruler that writes its reading into a screen selection as a decimal string.
- Web target renders `ruler-picker`.

## Unreleased

- Added public Builder V2 runtime capability, signed artifact, release, private
  delivery, and compatibility contracts for the React Native runtime.
- Added the explicit Builder V2 source-project manifest and immutable
  host-owned journey state contracts.
- Added signed Builder V2 interaction manifests, host-owned runtime event
  contracts, experiment attribution, and canonical interaction, exposure,
  purchase, and restore analytics events.
- Added the bounded runtime interaction capability. Generated source can invoke
  only compiler-declared interaction IDs and cannot emit privileged billing or
  experiment outcomes directly.

## 0.2.0-beta.1

- **Breaking:** `BaseEventSchema` requires `flowName` (1–60 chars) on every analytics event.

## 0.1.0-beta.3

- Added `BillingProduct.priceAmount`: the numeric price in major currency units, so apps can do price math without parsing the localized display string or reaching into `metadata`.
- Added `BillingProduct.billingPeriod` ({ unit, count }): the renewal period in machine-readable form, replacing pattern-matching on the raw store period string.
- Added `BillingProduct.introOffer`: an eligibility-checked introductory/promotional offer (price, payment mode, period, count).
- All three fields are optional; existing payloads keep validating unchanged.

## 0.1.0-beta.2

- Increased the accepted App Store signed transaction token size for purchase validation and restore payloads.

## 0.1.0-beta.0

Initial beta release candidate.

- Added runtime-safe flow, paywall, primitive, theme, analytics, billing, and experiment assignment contracts for public Onborn SDKs.
- Excluded backend, dashboard, builder, AI, template-management, and provider credential contracts from the public package surface.
