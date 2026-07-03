import { z } from "zod";
import { LayoutBgSchema } from "../../layout";
import { BaseStepSchema } from "../schema";
import {
  AnimatedAssetPrimitiveSchema,
  AvatarPrimitiveSchema,
  BackButtonPrimitiveSchema,
  BadgePrimitiveSchema,
  CarouselPaginationPrimitiveSchema,
  CarouselPrimitiveSchema,
  CTAButtonPrimitiveSchema,
  IconPrimitiveSchema,
  ImagePrimitiveSchema,
  InputPrimitiveSchema,
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
  QUIZ_ANSWER_LAYOUT_PRESET_VALUES,
  QUIZ_ANSWER_PRIMITIVE_VALUES,
} from "./types";

export const QuizAnswerPrimitiveSchema = z.enum(
  QUIZ_ANSWER_PRIMITIVE_VALUES,
);

export const QuizAnswerLayoutPresetSchema = z.enum(
  QUIZ_ANSWER_LAYOUT_PRESET_VALUES,
);

const QuizAnswerPrimitiveEntrySchema = z.union([
  ImagePrimitiveSchema,
  AnimatedAssetPrimitiveSchema,
  TitlePrimitiveSchema,
  SubtitlePrimitiveSchema,
  CTAButtonPrimitiveSchema,
  InputPrimitiveSchema,
  CarouselPrimitiveSchema,
  CarouselPaginationPrimitiveSchema,
  AvatarPrimitiveSchema,
  BadgePrimitiveSchema,
  BackButtonPrimitiveSchema,
  SkipButtonPrimitiveSchema,
  IconPrimitiveSchema,
  XStackPrimitiveSchema,
  YStackPrimitiveSchema,
]);

export const QuizAnswerPrimitivesSchema = z
  .object({
    image: ImagePrimitiveSchema.optional(),
    animated_asset: AnimatedAssetPrimitiveSchema.optional(),
    title: TitlePrimitiveSchema.optional(),
    subtitle: SubtitlePrimitiveSchema.optional(),
    cta_button: CTAButtonPrimitiveSchema.optional(),
    input: InputPrimitiveSchema.optional(),
    carousel: CarouselPrimitiveSchema.optional(),
    carousel_pagination: CarouselPaginationPrimitiveSchema.optional(),
    avatar: AvatarPrimitiveSchema.optional(),
    badge: BadgePrimitiveSchema.optional(),
    back_button: BackButtonPrimitiveSchema.optional(),
    skip_button: SkipButtonPrimitiveSchema.optional(),
    icon: IconPrimitiveSchema.optional(),
    x_stack: XStackPrimitiveSchema.optional(),
    y_stack: YStackPrimitiveSchema.optional(),
  })
  .catchall(QuizAnswerPrimitiveEntrySchema);

export const QuizAnswerStepSchema = BaseStepSchema.extend({
  type: z.literal("quiz_answer"),
  layout: z
    .object({
      preset: QuizAnswerLayoutPresetSchema,
      bg: LayoutBgSchema.optional(),
      fontFamily: TextFontFamilySchema.optional(),
      safeArea: z.boolean().optional(),
    })
    .strict(),
  primitives: QuizAnswerPrimitivesSchema,
});

export { SlotSchema as QuizAnswerPrimitiveSlotSchema };
export type QuizAnswerPrimitiveSlot = Slot;
export type QuizAnswerPrimitives = z.infer<typeof QuizAnswerPrimitivesSchema>;
export type QuizAnswerStep = z.infer<typeof QuizAnswerStepSchema>;
