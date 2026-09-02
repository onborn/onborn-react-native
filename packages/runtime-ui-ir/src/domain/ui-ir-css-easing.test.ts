import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  materializeUiIrCssEasing,
  parseUiIrCubicBezier,
} from "./ui-ir-css-easing";

describe("parseUiIrCubicBezier", () => {
  it("reads the four control points, spacing and negatives included", () => {
    assert.deepEqual(parseUiIrCubicBezier("cubic-bezier(0.23, 1, 0.32, 1)"), [
      0.23, 1, 0.32, 1,
    ]);
    assert.deepEqual(parseUiIrCubicBezier(" cubic-bezier(0.77,0,0.175,-1.5) "), [
      0.77, 0, 0.175, -1.5,
    ]);
  });

  it("leaves named curves and non-strings alone", () => {
    assert.equal(parseUiIrCubicBezier("ease-out"), null);
    assert.equal(parseUiIrCubicBezier(undefined), null);
    assert.equal(parseUiIrCubicBezier({ x1: 0 }), null);
  });
});

describe("materializeUiIrCssEasing", () => {
  const toEasing = (points: readonly number[]) => ({ bezier: [...points] });

  it("swaps both timing keys and keeps the rest of the style", () => {
    const style = {
      opacity: 1,
      animationTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
      transitionTimingFunction: "cubic-bezier(0.77, 0, 0.175, 1)",
      transitionProperty: ["borderColor"],
    };
    assert.deepEqual(materializeUiIrCssEasing(style, toEasing), {
      opacity: 1,
      animationTimingFunction: { bezier: [0.23, 1, 0.32, 1] },
      transitionTimingFunction: { bezier: [0.77, 0, 0.175, 1] },
      transitionProperty: ["borderColor"],
    });
    // The input is not mutated: the document is shared and immutable.
    assert.equal(style.animationTimingFunction, "cubic-bezier(0.23, 1, 0.32, 1)");
  });

  it("returns the very same object when nothing needs replacing", () => {
    const named = { transitionTimingFunction: "ease-out", opacity: 0.5 };
    assert.equal(materializeUiIrCssEasing(named, toEasing), named);
    assert.equal(materializeUiIrCssEasing(undefined, toEasing), undefined);
  });
});
