import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BuilderV2UiIrNode } from "@onborn/sdk-contracts/builder-v2-ui-ir";
import { uiIrScreenWantsInsets } from "./ui-ir-screen-insets";

function view(children: BuilderV2UiIrNode[] = [], style?: object): BuilderV2UiIrNode {
  return { id: "n", type: "view", style, children } as BuilderV2UiIrNode;
}

describe("uiIrScreenWantsInsets", () => {
  it("pads a plain content screen", () => {
    assert.equal(
      uiIrScreenWantsInsets(
        view([view([], { minHeight: 52 })], { backgroundColor: "#F5F1E8" }),
      ),
      true,
    );
  });

  it("leaves a full-bleed hero edge-to-edge", () => {
    const hero = {
      id: "hero",
      type: "image-background",
      style: { flex: 1 },
      children: [],
    } as unknown as BuilderV2UiIrNode;
    assert.equal(uiIrScreenWantsInsets(view([hero])), false);
  });

  it("leaves a safe-area-view root alone — the screen handles insets", () => {
    const root = {
      id: "root",
      type: "safe-area-view",
      children: [],
    } as unknown as BuilderV2UiIrNode;
    assert.equal(uiIrScreenWantsInsets(root), false);
  });

  it("leaves overlay compositions with absolute children edge-to-edge", () => {
    assert.equal(
      uiIrScreenWantsInsets(
        view([view([], { position: "absolute", top: 0 })]),
      ),
      false,
    );
  });
});
