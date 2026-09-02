import { z } from "zod";

const MotionDurationSchema = z.number().int().min(0).max(10_000);
const MotionDelaySchema = z.number().int().min(0).max(10_000);

export const BuilderV2UiIrReanimatedEnterPresetSchema = z.enum([
  "BounceIn",
  "BounceInUp",
  "BounceInDown",
  "BounceInLeft",
  "BounceInRight",
  "FadeIn",
  "FadeInUp",
  "FadeInDown",
  "FadeInLeft",
  "FadeInRight",
  "SlideInUp",
  "SlideInDown",
  "SlideInLeft",
  "SlideInRight",
  "StretchInX",
  "StretchInY",
  "PinwheelIn",
  "LightSpeedInLeft",
  "LightSpeedInRight",
  "RotateInDownLeft",
  "RotateInDownRight",
  "RotateInUpLeft",
  "RotateInUpRight",
  "RollInLeft",
  "RollInRight",
  "FlipInEasyX",
  "FlipInEasyY",
  "FlipInXDown",
  "FlipInXUp",
  "FlipInYLeft",
  "FlipInYRight",
  "ZoomIn",
  "ZoomInDown",
  "ZoomInEasyDown",
  "ZoomInEasyUp",
  "ZoomInLeft",
  "ZoomInRight",
  "ZoomInRotate",
  "ZoomInUp",
]);

export const BuilderV2UiIrReanimatedExitPresetSchema = z.enum([
  "BounceOut",
  "BounceOutUp",
  "BounceOutDown",
  "BounceOutLeft",
  "BounceOutRight",
  "FadeOut",
  "FadeOutUp",
  "FadeOutDown",
  "FadeOutLeft",
  "FadeOutRight",
  "SlideOutUp",
  "SlideOutDown",
  "SlideOutLeft",
  "SlideOutRight",
  "StretchOutX",
  "StretchOutY",
  "PinwheelOut",
  "LightSpeedOutLeft",
  "LightSpeedOutRight",
  "RotateOutDownLeft",
  "RotateOutDownRight",
  "RotateOutUpLeft",
  "RotateOutUpRight",
  "RollOutLeft",
  "RollOutRight",
  "FlipOutEasyX",
  "FlipOutEasyY",
  "FlipOutXDown",
  "FlipOutXUp",
  "FlipOutYLeft",
  "FlipOutYRight",
  "ZoomOut",
  "ZoomOutDown",
  "ZoomOutEasyDown",
  "ZoomOutEasyUp",
  "ZoomOutLeft",
  "ZoomOutRight",
  "ZoomOutRotate",
  "ZoomOutUp",
]);

export const BuilderV2UiIrReanimatedLayoutPresetSchema = z.enum([
  "LinearTransition",
  "SequencedTransition",
  "FadingTransition",
  "JumpingTransition",
  "CurvedTransition",
  "EntryExitTransition",
]);

export const BuilderV2UiIrReanimatedSpringSchema = z
  .object({
    damping: z.number().finite().positive().max(1_000).optional(),
    stiffness: z.number().finite().positive().max(10_000).optional(),
    mass: z.number().finite().positive().max(100).optional(),
    energyThreshold: z.number().finite().positive().max(1).optional(),
  })
  .strict();

const ReanimatedTransitionConfigSchema = {
  durationMs: MotionDurationSchema.optional(),
  delayMs: MotionDelaySchema.optional(),
  spring: BuilderV2UiIrReanimatedSpringSchema.optional(),
};

export const BuilderV2UiIrReanimatedEnterTransitionSchema = z
  .object({
    type: z.literal("reanimated"),
    preset: BuilderV2UiIrReanimatedEnterPresetSchema,
    ...ReanimatedTransitionConfigSchema,
  })
  .strict();

export const BuilderV2UiIrReanimatedExitTransitionSchema = z
  .object({
    type: z.literal("reanimated"),
    preset: BuilderV2UiIrReanimatedExitPresetSchema,
    ...ReanimatedTransitionConfigSchema,
  })
  .strict();

export const BuilderV2UiIrReanimatedLayoutTransitionSchema = z
  .object({
    type: z.literal("reanimated"),
    preset: BuilderV2UiIrReanimatedLayoutPresetSchema,
    ...ReanimatedTransitionConfigSchema,
  })
  .strict()
  .superRefine((transition, context) => {
    if (transition.spring && transition.preset !== "LinearTransition") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only LinearTransition supports spring modifiers",
        path: ["spring"],
      });
    }
  });

export const BuilderV2UiIrEnterAnimationSchema = z
  .object({
    property: z.enum(["opacity", "translateX", "translateY", "scale"]),
    from: z.number().finite(),
    to: z.number().finite(),
    durationMs: MotionDurationSchema,
  })
  .strict();

const BuilderV2UiIrTimingEnterTransitionSchema = z
  .object({
    type: z.literal("timing"),
    animations: z.array(BuilderV2UiIrEnterAnimationSchema).min(1).max(4),
  })
  .strict()
  .superRefine((transition, context) => {
    const properties = new Set<string>();
    transition.animations.forEach((animation, index) => {
      if (properties.has(animation.property)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate entrance animation for "${animation.property}"`,
          path: ["animations", index, "property"],
        });
      }
      properties.add(animation.property);
    });
  });

export const BuilderV2UiIrEnterTransitionSchema = z.union([
  /*
   * Legacy: the React Native Animated idiom, one property list per entrance,
   * View only, no exit. Still parsed for the artifacts that carry it; new
   * screens write Reanimated presets, which cover everything this did.
   */
  BuilderV2UiIrTimingEnterTransitionSchema,
  BuilderV2UiIrReanimatedEnterTransitionSchema,
]);

/**
 * How a screen arrives when the journey moves.
 *
 * Named, not described: the runtime knows the direction of travel and picks
 * the entrance for it — a step forward rises in from below, a step back
 * fades or slides in from where it came — so the same document reads
 * naturally both ways. Declared per flow with a per-screen override.
 */
export const BuilderV2UiIrScreenTransitionKindSchema = z.enum([
  "fade-up",
  "fade",
  "slide",
  "none",
]);

export const BuilderV2UiIrScreenTransitionSchema = z
  .object({
    kind: BuilderV2UiIrScreenTransitionKindSchema,
    durationMs: MotionDurationSchema.optional(),
  })
  .strict();

export type BuilderV2UiIrScreenTransitionKind = z.infer<
  typeof BuilderV2UiIrScreenTransitionKindSchema
>;
export type BuilderV2UiIrScreenTransition = z.infer<
  typeof BuilderV2UiIrScreenTransitionSchema
>;

export const BuilderV2UiIrExitTransitionSchema =
  BuilderV2UiIrReanimatedExitTransitionSchema;
export const BuilderV2UiIrLayoutTransitionSchema =
  BuilderV2UiIrReanimatedLayoutTransitionSchema;

export type BuilderV2UiIrEnterAnimation = z.infer<
  typeof BuilderV2UiIrEnterAnimationSchema
>;
export type BuilderV2UiIrEnterTransition = z.infer<
  typeof BuilderV2UiIrEnterTransitionSchema
>;
export type BuilderV2UiIrExitTransition = z.infer<
  typeof BuilderV2UiIrExitTransitionSchema
>;
export type BuilderV2UiIrLayoutTransition = z.infer<
  typeof BuilderV2UiIrLayoutTransitionSchema
>;
