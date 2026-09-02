import { z } from "zod";
import { BuilderV2UiIrPlanConditionSchema } from "./builder-v2-ui-ir-billing";

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
    /**
     * Present on a state a text field writes.
     *
     * A selection is one of a few known values and is reported as it is; free
     * text is whatever a person typed — usually their name — and leaves the
     * device only as "provided" unless the field opted into reporting the
     * value. The analytics allowlists the gym apps keep by hand are this
     * decision made once, in the document.
     */
    text: z
      .object({
        report: z.enum(["presence", "value"]),
      })
      .strict()
      .optional(),
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

/**
 * Every predicate a runtime-dependent appearance may be gated on.
 *
 * Two kinds, both enumerable: a screen-local selection equals a known value, or
 * a plan exists in the loaded offering. The second is what lets a paywall lay
 * out three plans and show only the two the offering actually has, instead of
 * rendering an empty row or inventing one.
 */
/**
 * "The journey is at its first (or last) screen", or "this screen asked the
 * chrome for variant V" — the predicates the chrome above the screens needs:
 * no back control on the first step, a white header on the outro.
 */
export const BuilderV2UiIrJourneyConditionSchema = z
  .object({
    journey: z.enum(["isFirst", "isLast", "variant"]),
    equals: z.union([z.string().max(40), z.null()]).optional(),
    negate: z.boolean().optional(),
  })
  .strict()
  .refine(
    (condition) =>
      condition.journey === "variant"
        ? condition.equals !== undefined
        : condition.equals === undefined,
    "variant compares against a value; isFirst and isLast take none",
  );

export type BuilderV2UiIrJourneyCondition = z.infer<
  typeof BuilderV2UiIrJourneyConditionSchema
>;

export const BuilderV2UiIrConditionSchema = z.union([
  BuilderV2UiIrStateConditionSchema,
  BuilderV2UiIrPlanConditionSchema,
  BuilderV2UiIrJourneyConditionSchema,
]);

export type BuilderV2UiIrCondition = z.infer<
  typeof BuilderV2UiIrConditionSchema
>;
