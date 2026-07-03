import { z } from "zod";

export const RuntimeExperimentAssignmentSchema = z.object({
  id: z.string(),
  variantId: z.string(),
  variantName: z.string().optional(),
  isBaseline: z.boolean().optional(),
  assignmentId: z.string().optional(),
});

export type RuntimeExperimentAssignment = z.infer<
  typeof RuntimeExperimentAssignmentSchema
>;
