import assert from "node:assert/strict";
import test from "node:test";

import { createUiIrAnswerStore } from "./ui-ir-answers";
import { resolveUiIrText } from "./ui-ir-document";
import { reportedUiIrAnswers } from "./ui-ir-state";

test("variables merge every screen's values, a later screen's write winning", () => {
  const store = createUiIrAnswerStore();
  assert.deepEqual(store.variables(), {});
  store.record("name", { name: "Anna" });
  store.record("goal", { goal: "strength", name: null });
  assert.deepEqual(store.variables(), { name: "Anna", goal: "strength" });
  store.record("later", { name: "Ann" });
  assert.deepEqual(store.variables(), { name: "Ann", goal: "strength" });
});

test("the snapshot is stable between writes and listeners hear every write", () => {
  const store = createUiIrAnswerStore();
  let notified = 0;
  const stop = store.subscribe(() => {
    notified += 1;
  });
  store.record("name", { name: "Anna" });
  const first = store.variables();
  assert.equal(store.variables(), first);
  store.record("name", { name: "Anna" });
  assert.equal(notified, 2);
  stop();
  store.record("name", { name: "Bea" });
  assert.equal(notified, 2);
});

test("copy speaks an answer back, falling back when it is missing", () => {
  const document = {
    localization: {
      defaultLocale: "en",
      resources: {
        en: { greeting: "Nice to meet you, {{name|there}}." },
        pl: { greeting: "Miło cię poznać, {{ name }}." },
      },
    },
  } as never;
  const greeting = { kind: "localized" as const, key: "greeting", fallback: "" };
  assert.equal(
    resolveUiIrText(document, greeting, "en", { name: "Anna" }),
    "Nice to meet you, Anna.",
  );
  assert.equal(
    resolveUiIrText(document, greeting, "en", { name: "   " }),
    "Nice to meet you, there.",
  );
  assert.equal(
    resolveUiIrText(document, greeting, "pl", {}),
    "Miło cię poznać, .",
  );
  assert.equal(
    resolveUiIrText(document, { kind: "literal", value: "Hi {{name}}!" }),
    "Hi !",
  );
});

test("free text leaves the device as presence unless the field reports its value", () => {
  const screen = {
    state: {
      name: { initial: "", text: { report: "presence" as const } },
      city: { initial: "", text: { report: "value" as const } },
      goal: { initial: null },
    },
  };
  assert.deepEqual(
    reportedUiIrAnswers(screen, { name: "Anna", city: "Oslo", goal: "strength" }),
    { name: "provided", city: "Oslo", goal: "strength" },
  );
  assert.deepEqual(
    reportedUiIrAnswers(screen, { name: "  ", city: "", goal: null }),
    { name: null, city: "", goal: null },
  );
});
