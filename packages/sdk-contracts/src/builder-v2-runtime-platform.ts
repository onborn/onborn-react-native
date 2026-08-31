import { z } from "zod";

export const BuilderV2ArtifactTargetSchema = z.enum(["web", "ios", "android"]);

export const BuilderV2RuntimeVersionSchema = z
  .string()
  .regex(/^onborn-runtime-[1-9]\d*$/);

export const BuilderV2CapabilityNameSchema = z.enum([
  "analytics",
  "assets",
  "auth",
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

/**
 * Capabilities every Onborn runtime provides, on every platform.
 *
 * Declaring one of these says nothing: the host satisfies it before the
 * artifact is loaded, so the declaration can neither fail a compatibility check
 * nor change what ships. The list matters because the rest — camera,
 * notifications, haptics — are real requirements a host may not meet, and
 * telling the two apart is what lets a check police the ones that matter.
 *
 * Kept here rather than in the runtime package so the builder, the artifact and
 * the device read the same list. The device's copy was the only one for a
 * while, which meant nothing on the authoring side could reason about it.
 */
export const BUILDER_V2_BUILT_IN_CAPABILITIES = [
  "analytics",
  "assets",
  "billing",
  "google-fonts",
  "image",
  "linking",
  "localization",
  "navigation",
  "phosphor-icons",
  "safe-area",
] as const satisfies readonly z.infer<typeof BuilderV2CapabilityNameSchema>[];

export function isBuiltInBuilderV2Capability(name: string): boolean {
  return (BUILDER_V2_BUILT_IN_CAPABILITIES as readonly string[]).includes(name);
}

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
