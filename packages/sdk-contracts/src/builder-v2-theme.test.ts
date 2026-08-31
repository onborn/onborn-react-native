import assert from "node:assert/strict";
import test from "node:test";

import {
  parseBuilderV2ThemeSource,
  serializeBuilderV2ThemeSource,
  type BuilderV2Theme,
} from "./builder-v2-theme";

/*
 * "Recreate Cal AI's welcome screen" died on `radii.button`: the model set a
 * pill, the cap was 96, and the whole run failed at promotion. A pill radius is
 * a shape instruction that React Native clamps to half the element — it is what
 * every onboarding call to action in the reference library uses.
 */
test("a pill radius is a valid theme value", () => {
  const source = serializeBuilderV2ThemeSource(
    themeWith({ card: 16, button: 999, input: 12 }),
  );

  assert.equal(parseBuilderV2ThemeSource(source).radii.button, 999);
});

test("a radius that is not a shape instruction is still refused", () => {
  // The bound only has to stop nonsense; it must not become no bound at all.
  assert.throws(() =>
    serializeBuilderV2ThemeSource(
      themeWith({ card: 16, button: 100_000, input: 12 }),
    ),
  );
});

function themeWith(radii: BuilderV2Theme["radii"]): BuilderV2Theme {
  const mode: BuilderV2Theme["light"] = {
    colors: {
      primary: "#111111",
      secondary: "#222222",
      tertiary: "#333333",
      neutral: "#444444",
      background: "#FFFFFF",
      surface: "#F5F5F5",
      text: "#000000",
      muted: "#666666",
      border: "#DDDDDD",
    },
  };
  const font: BuilderV2Theme["typography"]["body"] = {
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0,
  };
  return {
    schemaVersion: 1,
    light: mode,
    dark: mode,
    typography: { headline: font, body: font, label: font },
    radii,
    spacing: { screen: 20, section: 24, item: 12 },
  };
}
