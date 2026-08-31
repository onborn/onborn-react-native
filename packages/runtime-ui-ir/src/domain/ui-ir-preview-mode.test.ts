import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readUiIrPreviewMode } from "./ui-ir-preview-mode";

describe("preview mode", () => {
  it("reads the mode the builder canvas published", () => {
    assert.equal(
      readUiIrPreviewMode({ __onbornPreviewInteractionMode: "edit" }),
      "edit",
    );
    assert.equal(
      readUiIrPreviewMode({ __onbornPreviewInteractionMode: "live" }),
      "live",
    );
  });

  it("says nothing at all on a device", () => {
    // A published app has no editor, so this must not be mistaken for "edit"
    // and quietly disable motion the person paid for.
    assert.equal(readUiIrPreviewMode({}), null);
    assert.equal(
      readUiIrPreviewMode({ __onbornPreviewInteractionMode: "something" }),
      null,
    );
  });
});
