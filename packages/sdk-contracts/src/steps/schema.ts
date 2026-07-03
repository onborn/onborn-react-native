import { z } from "zod";

/** Shared fields for every funnel step in `FlowConfig.steps`. */
export const BaseStepSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export type BaseStep = z.infer<typeof BaseStepSchema>;
