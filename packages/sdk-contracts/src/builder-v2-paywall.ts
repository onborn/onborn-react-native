import { z } from "zod";

export const BuilderV2PaywallPlacementSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

export const BuilderV2PaywallPlacementResolutionSchema = z
  .object({
    schemaVersion: z.literal(1),
    placement: BuilderV2PaywallPlacementSchema,
    flowId: z.string().trim().min(1).max(160),
    screenId: z.string().trim().min(1).max(320),
    releaseId: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export type BuilderV2PaywallPlacement = z.infer<
  typeof BuilderV2PaywallPlacementSchema
>;
export type BuilderV2PaywallPlacementResolution = z.infer<
  typeof BuilderV2PaywallPlacementResolutionSchema
>;
