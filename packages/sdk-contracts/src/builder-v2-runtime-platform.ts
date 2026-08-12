import { z } from "zod";

export const BuilderV2ArtifactTargetSchema = z.enum(["web", "ios", "android"]);

export const BuilderV2RuntimeVersionSchema = z
  .string()
  .regex(/^onborn-runtime-[1-9]\d*$/);

export const BuilderV2CapabilityNameSchema = z.enum([
  "analytics",
  "assets",
  "billing",
  "blur",
  "camera",
  "google-fonts",
  "haptics",
  "image",
  "linking",
  "localization",
  "lottie",
  "navigation",
  "notifications",
  "phosphor-icons",
  "reanimated",
  "safe-area",
  "store-review",
]);

export const BuilderV2CapabilityRequirementSchema = z
  .object({
    name: BuilderV2CapabilityNameSchema,
    minimumVersion: z.number().int().positive(),
  })
  .strict();

export const BuilderV2RuntimeCapabilitySchema = z
  .object({
    name: BuilderV2CapabilityNameSchema,
    version: z.number().int().positive(),
  })
  .strict();

export type BuilderV2ArtifactTarget = z.infer<
  typeof BuilderV2ArtifactTargetSchema
>;
export type BuilderV2RuntimeVersion = z.infer<
  typeof BuilderV2RuntimeVersionSchema
>;
export type BuilderV2CapabilityName = z.infer<
  typeof BuilderV2CapabilityNameSchema
>;
export type BuilderV2CapabilityRequirement = z.infer<
  typeof BuilderV2CapabilityRequirementSchema
>;
export type BuilderV2RuntimeCapability = z.infer<
  typeof BuilderV2RuntimeCapabilitySchema
>;
