import assert from "node:assert/strict";
import test from "node:test";

import { BuilderV2UiIrDocumentSchema } from "./builder-v2-ui-ir";
import {
  readBuilderV2UiIrPlaceholders,
  resolveBuilderV2UiIrPlaceholders,
} from "./builder-v2-ui-ir-variables";

test("placeholders are read with their fallbacks", () => {
  assert.deepEqual(
    readBuilderV2UiIrPlaceholders("Hi {{name|there}}, {{ goal }} it is. {{}}"),
    [
      { name: "name", fallback: "there" },
      { name: "goal", fallback: null },
    ],
  );
});

test("resolution prefers a value, then the fallback, then nothing", () => {
  assert.equal(
    resolveBuilderV2UiIrPlaceholders("Hi {{name|there}} — {{goal}}!", {
      name: " Anna ",
    }),
    "Hi Anna — !",
  );
  assert.equal(
    resolveBuilderV2UiIrPlaceholders("Hi {{name|there}}", { name: "" }),
    "Hi there",
  );
  assert.equal(resolveBuilderV2UiIrPlaceholders("plain", {}), "plain");
});

function document(state: Record<string, { initial: string | null }> | undefined, text: string) {
  return {
    schemaVersion: 1,
    format: "onborn-ui-ir-v1",
    entryScreenId: "s",
    screens: [
      {
        screenId: "s",
        surface: "onboarding",
        ...(state ? { state } : {}),
        root: {
          type: "view",
          id: "root",
          children: [
            { type: "text", id: "t", text: { kind: "literal", value: text } },
          ],
        },
      },
    ],
    assets: [],
  };
}

test("a document may only speak states some screen declares", () => {
  assert.ok(
    BuilderV2UiIrDocumentSchema.safeParse(
      document({ name: { initial: "" } }, "Hi {{name}}"),
    ).success,
  );
  const refused = BuilderV2UiIrDocumentSchema.safeParse(
    document(undefined, "Hi {{name}}"),
  );
  assert.equal(refused.success, false);
  assert.match(
    refused.success ? "" : refused.error.issues[0]!.message,
    /\{\{name\}\}/,
  );
});
