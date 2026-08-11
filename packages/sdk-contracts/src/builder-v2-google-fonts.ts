import { z } from "zod";

export const BUILDER_V2_GOOGLE_FONTS_CAPABILITY_VERSION = 1 as const;

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const FontFamilySchema = z.string().trim().min(1).max(120);
const RuntimeFontFamilySchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(
    /^Onborn_[A-Za-z0-9_-]+$/,
    'Runtime font family aliases must use the reserved "Onborn_" prefix',
  );
const RelativeFontPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(320)
  .refine(
    (path) =>
      !path.startsWith("/") &&
      !path.includes("\\") &&
      path
        .split("/")
        .every(
          (segment) => segment !== "" && segment !== "." && segment !== "..",
        ),
    { message: "Font paths must be safe relative POSIX paths" },
  );

export const BuilderV2GoogleFontWeightSchema = z.union([
  z.literal(100),
  z.literal(200),
  z.literal(300),
  z.literal(400),
  z.literal(500),
  z.literal(600),
  z.literal(700),
  z.literal(800),
  z.literal(900),
]);

export const BuilderV2GoogleFontStyleSchema = z.enum(["normal", "italic"]);

export const BuilderV2ProjectGoogleFontVariantSchema = z
  .object({
    weight: BuilderV2GoogleFontWeightSchema,
    style: BuilderV2GoogleFontStyleSchema,
    fontFamily: RuntimeFontFamilySchema,
  })
  .strict();

export const BuilderV2ProjectGoogleFontFamilySchema = z
  .object({
    family: FontFamilySchema,
    variants: z.array(BuilderV2ProjectGoogleFontVariantSchema).min(1),
    subsets: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  })
  .strict()
  .superRefine((font, context) => {
    addDuplicateVariantIssues(font.variants, context);
  });

export const BuilderV2ProjectGoogleFontsSchema = z
  .object({
    provider: z.literal("google-fonts"),
    families: z.array(BuilderV2ProjectGoogleFontFamilySchema).min(1),
  })
  .strict()
  .superRefine((fonts, context) => {
    const familyNames = new Set<string>();
    const runtimeNames = new Set<string>();
    fonts.families.forEach((family, familyIndex) => {
      const normalizedFamily = family.family.toLocaleLowerCase("en-US");
      if (familyNames.has(normalizedFamily)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate Google Font family "${family.family}"`,
          path: ["families", familyIndex, "family"],
        });
      }
      familyNames.add(normalizedFamily);
      family.variants.forEach((variant, variantIndex) => {
        if (runtimeNames.has(variant.fontFamily)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate runtime font family "${variant.fontFamily}"`,
            path: [
              "families",
              familyIndex,
              "variants",
              variantIndex,
              "fontFamily",
            ],
          });
        }
        runtimeNames.add(variant.fontFamily);
      });
    });
  });

export const BuilderV2ArtifactGoogleFontSchema = z
  .object({
    provider: z.literal("google-fonts"),
    family: FontFamilySchema,
    weight: BuilderV2GoogleFontWeightSchema,
    style: BuilderV2GoogleFontStyleSchema,
    fontFamily: RuntimeFontFamilySchema,
    file: RelativeFontPathSchema,
    contentHash: Sha256Schema,
    byteLength: z.number().int().positive(),
    catalog: z
      .object({
        version: z.string().trim().min(1).max(80),
        lastModified: z.string().trim().min(1).max(40),
        category: z.string().trim().min(1).max(80),
        subsets: z.array(z.string().trim().min(1).max(80)).max(24),
      })
      .strict(),
    license: z
      .object({
        id: z.string().trim().min(1).max(80),
        url: z.string().url().max(2_048),
      })
      .strict(),
  })
  .strict();

function addDuplicateVariantIssues(
  variants: ReadonlyArray<{
    weight: number;
    style: string;
  }>,
  context: z.RefinementCtx,
): void {
  const keys = new Set<string>();
  variants.forEach((variant, index) => {
    const key = `${variant.weight}:${variant.style}`;
    if (keys.has(key)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate Google Font variant "${key}"`,
        path: ["variants", index],
      });
    }
    keys.add(key);
  });
}

export type BuilderV2GoogleFontWeight = z.infer<
  typeof BuilderV2GoogleFontWeightSchema
>;
export type BuilderV2GoogleFontStyle = z.infer<
  typeof BuilderV2GoogleFontStyleSchema
>;
export type BuilderV2ProjectGoogleFontVariant = z.infer<
  typeof BuilderV2ProjectGoogleFontVariantSchema
>;
export type BuilderV2ProjectGoogleFontFamily = z.infer<
  typeof BuilderV2ProjectGoogleFontFamilySchema
>;
export type BuilderV2ProjectGoogleFonts = z.infer<
  typeof BuilderV2ProjectGoogleFontsSchema
>;
export type BuilderV2ArtifactGoogleFont = z.infer<
  typeof BuilderV2ArtifactGoogleFontSchema
>;
