import assert from "node:assert/strict";
import test from "node:test";

import type { BuilderV2UiIrDocument } from "@onborn/sdk-contracts/builder-v2-ui-ir";

import { findUiIrScreen, resolveUiIrText } from "./ui-ir-document";

const document: BuilderV2UiIrDocument = {
  schemaVersion: 1,
  format: "onborn-ui-ir-v1",
  entryScreenId: "welcome",
  screens: [
    {
      screenId: "welcome",
      surface: "onboarding",
      root: { id: "root", type: "view", children: [] },
    },
  ],
  assets: [],
  localization: {
    defaultLocale: "en",
    resources: {
      en: { title: "Welcome" },
      pl: { title: "Witaj" },
    },
  },
};

test("resolves a selected locale and the default locale", () => {
  const text = {
    kind: "localized",
    key: "title",
    fallback: "Fallback",
  } as const;
  assert.equal(resolveUiIrText(document, text, "pl"), "Witaj");
  assert.equal(resolveUiIrText(document, text, "de"), "Welcome");
});

test("uses an explicit fallback when a key is not embedded", () => {
  const text = {
    kind: "localized",
    key: "missing",
    fallback: "Fallback",
  } as const;
  assert.equal(resolveUiIrText(document, text, "pl"), "Fallback");
});

test("fails closed for an unknown screen", () => {
  assert.throws(() => findUiIrScreen(document, "missing"), /is not declared/);
});
