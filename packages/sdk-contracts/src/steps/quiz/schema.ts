import { z } from "zod";
import { LayoutBgSchema } from "../../layout";
import { BaseStepSchema } from "../schema";
import {
  AnimatedAssetPrimitiveSchema,
  AvatarPrimitiveSchema,
  BackButtonPrimitiveSchema,
  BadgePrimitiveSchema,
  CTAButtonPrimitiveSchema,
  IconPrimitiveSchema,
  ImagePrimitiveSchema,
  InputPrimitiveSchema,
  QuizPrimitiveSchema as QuizQuestionPrimitiveSchema,
  SkipButtonPrimitiveSchema,
  SlotSchema,
  SubtitlePrimitiveSchema,
  TextFontFamilySchema,
  TitlePrimitiveSchema,
  XStackPrimitiveSchema,
  YStackPrimitiveSchema,
  type Slot,
} from "../../primitives";
import {
  QUIZ_LAYOUT_PRESET_VALUES,
  QUIZ_PRIMITIVE_VALUES,
} from "./types";

export const QuizStepPrimitiveSchema = z.enum(QUIZ_PRIMITIVE_VALUES);

export const QuizLayoutPresetSchema = z.enum(QUIZ_LAYOUT_PRESET_VALUES);

const QuizPrimitiveEntrySchema = z.union([
  ImagePrimitiveSchema,
  AnimatedAssetPrimitiveSchema,
  TitlePrimitiveSchema,
  SubtitlePrimitiveSchema,
  CTAButtonPrimitiveSchema,
  InputPrimitiveSchema,
  QuizQuestionPrimitiveSchema,
  AvatarPrimitiveSchema,
  BadgePrimitiveSchema,
  BackButtonPrimitiveSchema,
  SkipButtonPrimitiveSchema,
  IconPrimitiveSchema,
  XStackPrimitiveSchema,
  YStackPrimitiveSchema,
]);

export const QuizPrimitivesSchema = z
  .object({
    image: ImagePrimitiveSchema.optional(),
    animated_asset: AnimatedAssetPrimitiveSchema.optional(),
    title: TitlePrimitiveSchema.optional(),
    subtitle: SubtitlePrimitiveSchema.optional(),
    cta_button: CTAButtonPrimitiveSchema.optional(),
    input: InputPrimitiveSchema.optional(),
    quiz: QuizQuestionPrimitiveSchema.optional(),
    avatar: AvatarPrimitiveSchema.optional(),
    badge: BadgePrimitiveSchema.optional(),
    back_button: BackButtonPrimitiveSchema.optional(),
    skip_button: SkipButtonPrimitiveSchema.optional(),
    icon: IconPrimitiveSchema.optional(),
    x_stack: XStackPrimitiveSchema.optional(),
    y_stack: YStackPrimitiveSchema.optional(),
  })
  .catchall(QuizPrimitiveEntrySchema);

export const QuizStepSchema = BaseStepSchema.extend({
  type: z.literal("quiz"),
  layout: z
    .object({
      preset: QuizLayoutPresetSchema,
      bg: LayoutBgSchema.optional(),
      fontFamily: TextFontFamilySchema.optional(),
      safeArea: z.boolean().optional(),
    })
    .strict(),
  primitives: QuizPrimitivesSchema,
});

export { SlotSchema as QuizPrimitiveSlotSchema };
export type QuizPrimitiveSlot = Slot;
export type QuizPrimitives = z.infer<typeof QuizPrimitivesSchema>;
export type QuizStep = z.infer<typeof QuizStepSchema>;
