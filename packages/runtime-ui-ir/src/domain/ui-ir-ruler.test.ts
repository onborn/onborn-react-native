import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  uiIrRulerFractionDigits,
  uiIrRulerIndexAtOffset,
  uiIrRulerIndexOf,
  uiIrRulerStepCount,
  uiIrRulerValueAt,
} from "./ui-ir-ruler";

describe("ruler arithmetic", () => {
  it("maps readings to ticks and back", () => {
    const kilos = { min: 40, max: 200, step: 1 };
    assert.equal(uiIrRulerStepCount(kilos), 160);
    assert.equal(uiIrRulerIndexOf(kilos, "70"), 30);
    assert.equal(uiIrRulerValueAt(kilos, 30), "70");
    // A reading nobody wrote sits on the first tick.
    assert.equal(uiIrRulerIndexOf(kilos, null), 0);
    assert.equal(uiIrRulerIndexOf(kilos, "not a number"), 0);
    // Beyond the range clamps to the ends.
    assert.equal(uiIrRulerIndexOf(kilos, "500"), 160);
    assert.equal(uiIrRulerValueAt(kilos, 999), "200");
  });

  it("keeps the decimals the step needs", () => {
    const feet = { min: 1.6, max: 8.2, step: 0.1 };
    assert.equal(uiIrRulerFractionDigits(feet), 1);
    assert.equal(uiIrRulerValueAt(feet, 42), "5.8");
    assert.equal(uiIrRulerIndexOf(feet, "5.8"), 42);
    assert.equal(uiIrRulerFractionDigits({ min: 0, max: 1, step: 0.25 }), 2);
    assert.equal(
      uiIrRulerFractionDigits({ min: 0, max: 1, step: 0.5, fractionDigits: 0 }),
      0,
    );
  });

  it("reads the tick under the indicator from a scroll offset", () => {
    assert.equal(
      uiIrRulerIndexAtOffset({ offset: 365, itemWidth: 12, count: 160 }),
      30,
    );
    assert.equal(
      uiIrRulerIndexAtOffset({ offset: -20, itemWidth: 12, count: 160 }),
      0,
    );
    assert.equal(
      uiIrRulerIndexAtOffset({ offset: 99999, itemWidth: 12, count: 160 }),
      160,
    );
  });
});
