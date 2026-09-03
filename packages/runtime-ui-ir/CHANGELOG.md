# Changelog

## 0.7.0-beta.3

- Added `Switch`, exported from `@onborn/runtime-ui-ir/react`: the platform's switch as a view of one screen selection (`value`/`onChange` on a `useState<string | null>`, on while it equals `onValue`), with the native thumb animation on device and web.
- A paywall whose offering cannot be loaded at all (request failed, or nothing sold yet) renders the sample plans its author designed instead of empty rows; `UiIrPlanSnapshot.status` gains `sample`, and a purchase from a sample plan is refused. A loading or loaded offering is never replaced.

## 0.7.0-beta.2

- `RulerPicker` is inert on the builder canvas in edit mode: the strip no longer scrolls under a drag meant for the canvas or a click meant for a tick. Devices and Live mode are unchanged.
- Sheets on the web are drawn inside the journey frame: a `modal` node no longer stretches across the browser viewport when the funnel runs as a phone-width column. Escape closes it.
- Fixed a crash on devices when a screen mounted a `RulerPicker` ("undefined is not a function" on `window.addEventListener`).
- A sheet slides back down when its picker state clears instead of vanishing; the node outlives its gate for the length of the platform's slide.
- `RulerPicker` no longer fights its own momentum: a flick coasts to a tick instead of snapping back to where the finger left, and haptics are rate-limited during fast scrolls.

## 0.7.0-beta.1

- Added `RulerPicker`, exported from `@onborn/runtime-ui-ir/react`, with snapping, a haptic per tick and the counting number.
- `SegmentedControl` and `RulerPicker` accept canvas markers for their styled parts.
- Video clips are declared among a document's assets, so a screen that plays one no longer fails with "asset is not declared".

## 0.2.0-beta.1

- Added the signed UI IR artifact runtime.
- Added strict compatibility and integrity verification.
- Added deterministic journey and action execution.
- Added last-known-good artifact recovery.
