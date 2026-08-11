import assert from "node:assert/strict";
import test from "node:test";

import type {
  BuilderV2UiIrDocument,
  BuilderV2UiIrNode,
} from "@onborn/sdk-contracts/builder-v2-ui-ir";

import { createUiIrNodeCommonProps } from "./ui-ir-node-props";

test("keeps React's reserved key out of spread node props", () => {
  const props = createUiIrNodeCommonProps(
    node({ kind: "literal", value: "Welcome screen" }),
    document(),
  );

  assert.deepEqual(props, { accessibilityLabel: "Welcome screen" });
  assert.equal("key" in props, false);
});

/*
 * The label carries a key now rather than a finished string, so a screen read
 * in Polish has to be announced in Polish. Rendering the value unresolved would
 * hand the screen reader an object.
 */
test("a localized label is announced in the active locale", () => {
  const labelled = node({
    kind: "localized",
    key: "welcome.title",
    fallback: "Welcome",
  });

  assert.deepEqual(createUiIrNodeCommonProps(labelled, document(), "pl"), {
    accessibilityLabel: "Witaj",
  });
  assert.deepEqual(createUiIrNodeCommonProps(labelled, document(), "en"), {
    accessibilityLabel: "Welcome",
  });
});

test("an unknown locale falls back rather than announcing the key", () => {
  // A screen reader saying "welcome.title" is worse than saying the default
  // language, which is why the fallback travels with the key.
  const props = createUiIrNodeCommonProps(
    node({ kind: "localized", key: "missing.key", fallback: "Hero image" }),
    document(),
    "de",
  );

  assert.deepEqual(props, { accessibilityLabel: "Hero image" });
});

test("a node without a label contributes nothing", () => {
  assert.deepEqual(createUiIrNodeCommonProps(node(), document()), {});
});

function node(
  accessibilityLabel?: BuilderV2UiIrNode["accessibilityLabel"],
): BuilderV2UiIrNode {
  return {
    id: "welcome.root",
    type: "view",
    ...(accessibilityLabel ? { accessibilityLabel } : {}),
    children: [],
  };
}

function document(): BuilderV2UiIrDocument {
  return {
    localization: {
      defaultLocale: "en",
      resources: {
        en: { "welcome.title": "Welcome" },
        pl: { "welcome.title": "Witaj" },
      },
    },
  } as BuilderV2UiIrDocument;
}
