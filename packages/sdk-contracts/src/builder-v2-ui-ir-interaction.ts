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

/**
 * A named piece of screen-local state: which option is selected.
 *
 * Deliberately only a selection — a string or nothing. The artifact stays a
 * description because the state machine is enumerable: every value it can hold
 * is written in the document, every transition is a `state.set` action, and
 * every consequence is a declared variant. Nothing is computed at runtime
 * beyond an equality check.
 */
export const BuilderV2UiIrScreenStateSchema = z
  .object({
    initial: z.union([z.string().max(240), z.null()]),
  })
  .strict();

export type BuilderV2UiIrScreenState = z.infer<
  typeof BuilderV2UiIrScreenStateSchema
>;

/**
 * "State X currently equals V" — the only predicate the dialect has.
 *
 * One condition shape reused everywhere a runtime-dependent appearance is
 * allowed: style variants, node presence, disabled, accessibility selection.
 * Extending the dialect means adding *slots* that accept a condition, not new
 * kinds of logic — which is what keeps the artifact reviewable.
 */
export const BuilderV2UiIrStateConditionSchema = z
  .object({
    state: z.string().trim().min(1).max(80),
    equals: z.union([z.string().max(240), z.null()]),
    negate: z.boolean().optional(),
  })
  .strict();

export type BuilderV2UiIrStateCondition = z.infer<
  typeof BuilderV2UiIrStateConditionSchema
>;
