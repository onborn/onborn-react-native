import { z } from "zod";

const BuilderV2UiIrPressMotionSchema = z
  .object({
    idle: z.number().finite(),
    pressed: z.number().finite(),
    pressInDurationMs: z.number().int().nonnegative().max(5_000),
    pressOutDurationMs: z.number().int().nonnegative().max(5_000),
  })
  .strict();

export const BuilderV2UiIrPressFeedbackSchema = z
  .object({
    scale: BuilderV2UiIrPressMotionSchema.optional(),
    opacity: BuilderV2UiIrPressMotionSchema.optional(),
    haptic: z.enum(["light", "medium", "heavy", "selection"]).optional(),
  })
  .strict()
  .refine((feedback) => feedback.scale || feedback.opacity || feedback.haptic, {
    message: "Press feedback must animate scale or opacity, or trigger haptics",
  });

export type BuilderV2UiIrPressFeedback = z.infer<
  typeof BuilderV2UiIrPressFeedbackSchema
>;
