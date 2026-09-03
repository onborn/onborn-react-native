# Changelog

## 0.7.0-beta.2

- `RulerPicker` is inert on the builder canvas in edit mode: the strip no longer scrolls under a drag meant for the canvas or a click meant for a tick. Devices and Live mode are unchanged.

## 0.7.0-beta.1

- Added `RulerPicker`, exported from `@onborn/runtime-ui-ir/react`, with snapping, a haptic per tick and the counting number.
- `SegmentedControl` and `RulerPicker` accept canvas markers for their styled parts.
- Video clips are declared among a document's assets, so a screen that plays one no longer fails with "asset is not declared".

## 0.2.0-beta.1

- Added the signed UI IR artifact runtime.
- Added strict compatibility and integrity verification.
- Added deterministic journey and action execution.
- Added last-known-good artifact recovery.
