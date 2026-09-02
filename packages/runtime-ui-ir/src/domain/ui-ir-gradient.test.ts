import assert from "node:assert/strict";
import test from "node:test";

import {
  uiIrGradientAxis,
  uiIrGradientCornerRadius,
  uiIrGradientElementId,
  uiIrGradientStops,
} from "./ui-ir-gradient";

test("stops spread evenly when the document names no locations", () => {
  const stops = uiIrGradientStops({ colors: ["#000000", "#FF0000", "#FFFFFF"] });
  assert.deepEqual(
    stops.map((stop) => stop.offset),
    [0, 0.5, 1],
  );
  assert.ok(stops.every((stop) => stop.opacity === 1));
});

test("locations place the stops and alpha leaves the colour", () => {
  const stops = uiIrGradientStops({
    colors: ["transparent", "#00000080", "#000000"],
    locations: [0, 0.4, 1],
  });
  assert.deepEqual(stops, [
    { offset: 0, color: "#000000", opacity: 0 },
    { offset: 0.4, color: "#000000", opacity: 128 / 255 },
    { offset: 1, color: "#000000", opacity: 1 },
  ]);
});

test("mismatched locations fall back to even spacing rather than misplacing stops", () => {
  const stops = uiIrGradientStops({
    colors: ["#000000", "#FFFFFF"],
    locations: [0, 0.5, 1],
  });
  assert.deepEqual(
    stops.map((stop) => stop.offset),
    [0, 1],
  );
});

test("the axis defaults to top-to-bottom, as expo-linear-gradient does", () => {
  assert.deepEqual(uiIrGradientAxis({}), { x1: 0.5, y1: 0, x2: 0.5, y2: 1 });
  assert.deepEqual(
    uiIrGradientAxis({ start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }),
    { x1: 0, y1: 0, x2: 1, y2: 1 },
  );
});

test("the element id is safe for a url(#…) reference", () => {
  assert.equal(
    uiIrGradientElementId("node:welcome:root/0:12"),
    "onborn-gradient-node-welcome-root-0-12",
  );
});

test("only a uniform borderRadius is drawn into the rectangle", () => {
  assert.equal(uiIrGradientCornerRadius({ borderRadius: 16 }), 16);
  assert.equal(
    uiIrGradientCornerRadius({ borderRadius: 16, borderTopLeftRadius: 0 }),
    undefined,
  );
  assert.equal(uiIrGradientCornerRadius({ flex: 1 }), undefined);
  assert.equal(uiIrGradientCornerRadius(undefined), undefined);
});
