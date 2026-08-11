import { z } from "zod";

export const BUILDER_V2_EXPO_CAPABILITY_CONFIG_KEY =
  "onbornRuntimeCapabilities" as const;

export const BuilderV2NativeCapabilityNameSchema = z.enum([
  "billing",
  "camera",
  "haptics",
  "notifications",
  "store-review",
]);

export const BuilderV2NativeCapabilityRegistrationSchema = z
  .object({
    name: BuilderV2NativeCapabilityNameSchema,
    version: z.number().int().positive(),
  })
  .strict();

export const BuilderV2NativeCapabilityDeclarationSchema = z
  .object({
    schemaVersion: z.literal(1),
    capabilities: z
      .array(BuilderV2NativeCapabilityRegistrationSchema)
      .max(32),
  })
  .strict()
  .superRefine((declaration, context) => {
    const names = new Set<string>();
    declaration.capabilities.forEach((capability, index) => {
      if (names.has(capability.name)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate native capability "${capability.name}"`,
          path: ["capabilities", index, "name"],
        });
      }
      names.add(capability.name);
    });
  });

export type BuilderV2NativeCapabilityName = z.infer<
  typeof BuilderV2NativeCapabilityNameSchema
>;
export type BuilderV2NativeCapabilityRegistration = z.infer<
  typeof BuilderV2NativeCapabilityRegistrationSchema
>;
export type BuilderV2NativeCapabilityDeclaration = z.infer<
  typeof BuilderV2NativeCapabilityDeclarationSchema
>;
