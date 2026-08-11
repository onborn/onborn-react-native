import { z } from "zod";

export const BUILDER_V2_PHOSPHOR_CAPABILITY_VERSION = 1 as const;
export const BUILDER_V2_PHOSPHOR_PACKAGE_NAME =
  "phosphor-react-native" as const;
export const BUILDER_V2_PHOSPHOR_PACKAGE_VERSION = "3.0.6" as const;

export const BuilderV2ProjectPhosphorIconsSchema = z
  .object({
    packageName: z.literal(BUILDER_V2_PHOSPHOR_PACKAGE_NAME),
    packageVersion: z.literal(BUILDER_V2_PHOSPHOR_PACKAGE_VERSION),
  })
  .strict();

export const BuilderV2PhosphorIconExportNameSchema = z
  .string()
  .trim()
  .min(5)
  .max(160)
  .regex(
    /^[A-Z][A-Za-z0-9]*Icon$/,
    'Phosphor icon exports must use canonical "*Icon" names',
  );

export const BuilderV2PhosphorIconWeightSchema = z.enum([
  "thin",
  "light",
  "regular",
  "bold",
  "fill",
  "duotone",
]);

export const BuilderV2ArtifactPhosphorIconsSchema =
  BuilderV2ProjectPhosphorIconsSchema.extend({
    imports: z
      .array(BuilderV2PhosphorIconExportNameSchema)
      .min(1)
      .max(2_000),
  })
    .strict()
    .superRefine((icons, context) => {
      const names = new Set<string>();
      icons.imports.forEach((name, index) => {
        if (names.has(name)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate Phosphor icon export "${name}"`,
            path: ["imports", index],
          });
        }
        names.add(name);
      });
    });

export type BuilderV2ProjectPhosphorIcons = z.infer<
  typeof BuilderV2ProjectPhosphorIconsSchema
>;
export type BuilderV2ArtifactPhosphorIcons = z.infer<
  typeof BuilderV2ArtifactPhosphorIconsSchema
>;
export type BuilderV2PhosphorIconWeight = z.infer<
  typeof BuilderV2PhosphorIconWeightSchema
>;
