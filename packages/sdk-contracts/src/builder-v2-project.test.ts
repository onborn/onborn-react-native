import assert from "node:assert/strict";
import test from "node:test";

import {
  BuilderV2ProjectManifestSchema,
  BuilderV2ProjectScreenSchema,
} from "./builder-v2-project";

test("accepts one flat resource file per declared locale", () => {
  const manifest = BuilderV2ProjectManifestSchema.parse(
    projectManifest({
      defaultLocale: "en",
      locales: [
        { code: "en", label: "English" },
        { code: "pl", label: "Polski" },
      ],
      resources: {
        en: "locales/en.json",
        pl: "locales/pl.json",
      },
    }),
  );

  assert.deepEqual(manifest.localization?.resources, {
    en: "locales/en.json",
    pl: "locales/pl.json",
  });
});

test("rejects the removed aggregate resourceFile contract", () => {
  const result = BuilderV2ProjectManifestSchema.safeParse(
    projectManifest({
      defaultLocale: "en",
      locales: [{ code: "en", label: "English" }],
      resourceFile: "locales/resources.json",
    }),
  );

  assert.equal(result.success, false);
});

test("requires a distinct resource file for every declared locale", () => {
  const missing = BuilderV2ProjectManifestSchema.safeParse(
    projectManifest({
      defaultLocale: "en",
      locales: [
        { code: "en", label: "English" },
        { code: "pl", label: "Polski" },
      ],
      resources: { en: "locales/en.json" },
    }),
  );
  const shared = BuilderV2ProjectManifestSchema.safeParse(
    projectManifest({
      defaultLocale: "en",
      locales: [
        { code: "en", label: "English" },
        { code: "pl", label: "Polski" },
      ],
      resources: {
        en: "locales/copy.json",
        pl: "locales/copy.json",
      },
    }),
  );

  assert.equal(missing.success, false);
  assert.equal(shared.success, false);
});

function projectManifest(localization: Record<string, unknown>) {
  return {
    schemaVersion: 1,
    entryScreenId: "welcome",
    screens: [
      {
        screenId: "welcome",
        file: "screens/Welcome.tsx",
        surface: "onboarding",
      },
    ],
    localization,
  };
}

/*
 * Absence already means both channels, so naming both is noise the document
 * should not carry two spellings of — and a single channel only ever narrows.
 */
test("screen channels canonicalize: both named reads as absent", () => {
  const parsed = BuilderV2ProjectScreenSchema.parse({
    screenId: "welcome",
    file: "screens/WelcomeScreen.tsx",
    surface: "onboarding",
    channels: ["app", "web"],
  });
  assert.equal(parsed.channels, undefined);

  const narrowed = BuilderV2ProjectScreenSchema.parse({
    screenId: "welcome",
    file: "screens/WelcomeScreen.tsx",
    surface: "onboarding",
    channels: ["app"],
  });
  assert.deepEqual(narrowed.channels, ["app"]);
});
