import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reconcileUiIrYogaAspectRatio } from "./ui-ir-yoga-aspect-ratio";

describe("reconcileUiIrYogaAspectRatio", () => {
  it("centres a percent-width box whose aspect ratio is height-clamped", () => {
    assert.deepEqual(
      reconcileUiIrYogaAspectRatio({
        width: "100%",
        aspectRatio: 4 / 3,
        maxHeight: 220,
      }),
      { width: "100%", aspectRatio: 4 / 3, maxHeight: 220, alignSelf: "center" },
    );
  });

  it("centres the symmetric percent-height case", () => {
    assert.equal(
      reconcileUiIrYogaAspectRatio({
        height: "100%",
        aspectRatio: 1,
        maxWidth: 300,
      })?.alignSelf,
      "center",
    );
  });

  it("respects an explicit alignSelf", () => {
    assert.equal(
      reconcileUiIrYogaAspectRatio({
        width: "100%",
        aspectRatio: 1,
        maxHeight: 100,
        alignSelf: "flex-end",
      })?.alignSelf,
      "flex-end",
    );
  });

  it("leaves unclamped and fixed-size boxes alone", () => {
    const unclamped = { width: "100%", aspectRatio: 1 };
    assert.equal(reconcileUiIrYogaAspectRatio(unclamped), unclamped);
    const fixed = { width: 200, aspectRatio: 1, maxHeight: 100 };
    assert.equal(reconcileUiIrYogaAspectRatio(fixed), fixed);
    assert.equal(reconcileUiIrYogaAspectRatio(undefined), undefined);
  });
});
