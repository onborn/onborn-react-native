import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { layoutUiIrChartBars, layoutUiIrChartLine } from "./ui-ir-chart";

describe("chart layout", () => {
  it("scales from zero rather than from the smallest value", () => {
    /*
     * The whole reason this is arithmetic we own. A chart that starts at the
     * minimum makes 20 next to 200 look like a near-tie or a wipeout depending
     * on the baseline — on an onboarding screen comparing "with" and "without"
     * that is the difference between a claim and a misleading one.
     */
    const bars = layoutUiIrChartBars({
      series: [{ value: 20 }, { value: 200 }],
      width: 100,
      height: 100,
      gap: 0,
    });

    assert.equal(bars[0]?.height, 10);
    assert.equal(bars[1]?.height, 100);
  });

  it("keeps every bar inside the box it was given", () => {
    const bars = layoutUiIrChartBars({
      series: [{ value: 3 }, { value: 9 }, { value: 6 }],
      width: 120,
      height: 80,
    });

    for (const bar of bars) {
      assert.ok(bar.y >= 0 && bar.y + bar.height <= 80.001);
      assert.ok(bar.x >= 0 && bar.x + bar.width <= 120.001);
    }
  });

  it("draws a flat row for a series that is all zeroes", () => {
    // Dividing by a zero peak would produce NaN geometry, which renders as
    // nothing at all and reads as a broken chart rather than an empty one.
    const bars = layoutUiIrChartBars({
      series: [{ value: 0 }, { value: 0 }],
      width: 50,
      height: 50,
    });

    assert.deepEqual(
      bars.map((bar) => bar.height),
      [0, 0],
    );
  });

  it("puts a single line point in the middle rather than at the edge", () => {
    assert.equal(
      layoutUiIrChartLine({ series: [{ value: 5 }], width: 100, height: 40 }),
      "50.00,0.00",
    );
  });
});
