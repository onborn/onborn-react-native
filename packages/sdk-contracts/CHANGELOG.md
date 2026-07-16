# Changelog

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
