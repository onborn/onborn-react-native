# Changelog

## 0.6.0-beta.1

- `HttpUiIrArtifactDelivery` reports `country`/`appVersion` and always requests the experiment assignment stamp.
- `refreshUiIrArtifact` returns the delivery's `experiment` assignment (network paths only; offline last-known-good carries none).
- Synced runtime with the platform: carousel, chart, Lottie, asset resolver.

## 0.2.0-beta.1

- Added the signed UI IR artifact runtime.
- Added strict compatibility and integrity verification.
- Added deterministic journey and action execution.
- Added last-known-good artifact recovery.
