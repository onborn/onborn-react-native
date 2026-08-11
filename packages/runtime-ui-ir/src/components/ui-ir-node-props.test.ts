import assert from "node:assert/strict";
import test from "node:test";

import type { BuilderV2UiIrNode } from "@onborn/sdk-contracts/builder-v2-ui-ir";

import { createUiIrNodeCommonProps } from "./ui-ir-node-props";

test("keeps React's reserved key out of spread node props", () => {
  const node: BuilderV2UiIrNode = {
    id: "welcome.root",
    type: "view",
    accessibilityLabel: "Welcome screen",
    children: [],
  };

  const props = createUiIrNodeCommonProps(node);

  assert.deepEqual(props, { accessibilityLabel: "Welcome screen" });
  assert.equal("key" in props, false);
});
