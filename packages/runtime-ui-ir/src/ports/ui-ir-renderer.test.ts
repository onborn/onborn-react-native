import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";

import type { BuilderV2UiIrNode } from "@onborn/sdk-contracts/builder-v2-ui-ir";

import {
  decorateRenderedUiIrNode,
  type UiIrNodeDecorationInput,
  type UiIrRendererPorts,
} from "./ui-ir-renderer";

const node: BuilderV2UiIrNode = {
  id: "welcome.title",
  type: "text",
  text: { kind: "literal", value: "Welcome" },
};

test("lets editor hosts decorate a rendered node without changing UI IR", () => {
  const decorated: UiIrNodeDecorationInput[] = [];
  const element = createElement("test-node");
  const ports = {
    decorateNode: (input: UiIrNodeDecorationInput) => {
      decorated.push(input);
      return input.element;
    },
  } as Pick<UiIrRendererPorts, "decorateNode">;

  const result = decorateRenderedUiIrNode(ports, {
    screenId: "welcome",
    node,
    element,
  });

  assert.equal(decorated[0]?.screenId, "welcome");
  assert.equal(decorated[0]?.node.id, "welcome.title");
  assert.equal(result, element);
});

test("returns the original element when a host does not decorate nodes", () => {
  const element = createElement("test-node");
  const result = decorateRenderedUiIrNode(
    {},
    { screenId: "welcome", node, element },
  );
  assert.equal(result, element);
});
