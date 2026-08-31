import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { uiIrCarouselNextPage, uiIrCarouselPageAt } from "./ui-ir-carousel";

describe("carousel paging", () => {
  it("reads the page from the offset the device reported", () => {
    assert.equal(
      uiIrCarouselPageAt({ offset: 0, pageWidth: 390, pageCount: 3 }),
      0,
    );
    assert.equal(
      uiIrCarouselPageAt({ offset: 780, pageWidth: 390, pageCount: 3 }),
      2,
    );
    // Rubber-banding past the last page still reports the last page rather
    // than an index nothing renders at.
    assert.equal(
      uiIrCarouselPageAt({ offset: 1_400, pageWidth: 390, pageCount: 3 }),
      2,
    );
  });

  it("survives the frame before the strip has been measured", () => {
    // Width is zero until the first layout, and dividing by it would light no
    // dot at all.
    assert.equal(
      uiIrCarouselPageAt({ offset: 120, pageWidth: 0, pageCount: 3 }),
      0,
    );
  });

  it("wraps rather than stopping on the last page", () => {
    assert.equal(uiIrCarouselNextPage(0, 3), 1);
    assert.equal(uiIrCarouselNextPage(2, 3), 0);
    assert.equal(uiIrCarouselNextPage(0, 0), 0);
  });
});
