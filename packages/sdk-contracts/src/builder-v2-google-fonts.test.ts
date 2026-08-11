import assert from "node:assert/strict";
import test from "node:test";

import { BuilderV2ProjectGoogleFontsSchema } from "./builder-v2-google-fonts";

test("accepts more than two font families and six total variants", () => {
  const fonts = BuilderV2ProjectGoogleFontsSchema.parse({
    provider: "google-fonts",
    families: [
      {
        family: "Inter",
        variants: [
          { weight: 400, style: "normal", fontFamily: "Onborn_Inter_400" },
          { weight: 600, style: "normal", fontFamily: "Onborn_Inter_600" },
          { weight: 700, style: "normal", fontFamily: "Onborn_Inter_700" },
        ],
      },
      {
        family: "Fraunces",
        variants: [
          {
            weight: 400,
            style: "normal",
            fontFamily: "Onborn_Fraunces_400",
          },
          {
            weight: 600,
            style: "normal",
            fontFamily: "Onborn_Fraunces_600",
          },
          {
            weight: 700,
            style: "normal",
            fontFamily: "Onborn_Fraunces_700",
          },
        ],
      },
      {
        family: "Roboto Mono",
        variants: [
          {
            weight: 400,
            style: "normal",
            fontFamily: "Onborn_Roboto_Mono_400",
          },
          {
            weight: 400,
            style: "italic",
            fontFamily: "Onborn_Roboto_Mono_400_Italic",
          },
          {
            weight: 700,
            style: "normal",
            fontFamily: "Onborn_Roboto_Mono_700",
          },
        ],
      },
    ],
  });

  assert.equal(fonts.families.length, 3);
  assert.equal(
    fonts.families.reduce(
      (variantCount, family) => variantCount + family.variants.length,
      0,
    ),
    9,
  );
});
