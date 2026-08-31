import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { BUILDER_V2_UI_IR_WEB_DISPOSITIONS } from "./builder-v2-ui-ir-web-target.js";

/*
 * The web funnel is the second consumer of the artifact, and this is its seat
 * at the table: every node type the dialect can express must state how the
 * funnel treats it. Read off the primitives source rather than the zod
 * internals, so the assertion survives schema refactors that keep the shape.
 */
test("every UI IR node type declares its web disposition", () => {
  const source = readFileSync(
    fileURLToPath(
      new URL("./builder-v2-ui-ir-primitives.ts", import.meta.url),
    ),
    "utf-8",
  );
  const nodeTypes = [
    ...new Set(
      [...source.matchAll(/type: z\.literal\("([a-z-]+)"\)/g)].map(
        (match) => match[1]!,
      ),
    ),
  ];

  assert.ok(nodeTypes.length >= 20, "the primitives source stopped matching");
  for (const nodeType of nodeTypes) {
    assert.ok(
      nodeType in BUILDER_V2_UI_IR_WEB_DISPOSITIONS,
      `"${nodeType}" has no web disposition. The artifact has two consumers; ` +
        "declare how the web funnel treats this node in " +
        "builder-v2-ui-ir-web-target.ts before shipping the dialect change.",
    );
  }

  // And nothing stale: a removed node type leaves no orphaned declaration.
  for (const declared of Object.keys(BUILDER_V2_UI_IR_WEB_DISPOSITIONS)) {
    assert.ok(
      nodeTypes.includes(declared),
      `"${declared}" is declared for the web target but no longer exists in the dialect.`,
    );
  }
});
