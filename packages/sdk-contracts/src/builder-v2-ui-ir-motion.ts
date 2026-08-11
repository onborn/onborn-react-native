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
  BuilderV2UiIrTimingEnterTransitionSchema,
  BuilderV2UiIrReanimatedEnterTransitionSchema,
]);

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
