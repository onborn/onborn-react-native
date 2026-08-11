import { z } from "zod";

export const BuilderV2UiIrVectorScalarSchema = z.union([
  z.number().finite(),
  z.string().trim().min(1).max(240),
]);

export const BuilderV2UiIrVectorPaintSchema = z
  .object({
    fill: z.string().trim().min(1).max(240).optional(),
    stroke: z.string().trim().min(1).max(240).optional(),
    strokeWidth: BuilderV2UiIrVectorScalarSchema.optional(),
    strokeLinecap: z.enum(["butt", "round", "square"]).optional(),
    strokeLinejoin: z.enum(["miter", "round", "bevel"]).optional(),
  })
  .strict();

export type BuilderV2UiIrVectorScalar = z.infer<
  typeof BuilderV2UiIrVectorScalarSchema
>;
export type BuilderV2UiIrVectorPaint = z.infer<
  typeof BuilderV2UiIrVectorPaintSchema
>;
