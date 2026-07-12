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
  CTAButtonVariantSchema,
  FeaturesPrimitiveSchema,
  IconPrimitiveSchema,
  ImagePrimitiveSchema,
  InputPrimitiveSchema,
  LoadingPrimitiveSchema,
  ProgressBarPrimitiveSchema,
  QuizPrimitiveSchema as QuizQuestionPrimitiveSchema,
  SkipButtonPrimitiveSchema,
  SlotSchema,
  SubtitlePrimitiveSchema,
  TestimonialCardPrimitiveSchema,
  TextFontFamilySchema,
  TitlePrimitiveSchema,
  TogglePrimitiveSchema,
  XStackPrimitiveSchema,
  YStackPrimitiveSchema,
  type CTAButtonVariant,
  type Slot,
} from "../../primitives";
import { CUSTOM_LAYOUT_PRESET_VALUES, CUSTOM_PRIMITIVE_VALUES } from "./types";

export const CustomPrimitiveSchema = z.enum(CUSTOM_PRIMITIVE_VALUES);

export const CustomLayoutPresetSchema = z.enum(CUSTOM_LAYOUT_PRESET_VALUES);

const CustomPrimitiveEntrySchema = z.union([
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
  QuizQuestionPrimitiveSchema,
  FeaturesPrimitiveSchema,
  TestimonialCardPrimitiveSchema,
  LoadingPrimitiveSchema,
  ProgressBarPrimitiveSchema,
  TogglePrimitiveSchema,
]);

export const CustomPrimitivesSchema: z.ZodType<
  Record<string, z.infer<typeof CustomPrimitiveEntrySchema>>
> = z
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
    quiz: QuizQuestionPrimitiveSchema.optional(),
    features: FeaturesPrimitiveSchema.optional(),
    testimonial_card: TestimonialCardPrimitiveSchema.optional(),
    loading: LoadingPrimitiveSchema.optional(),
    progress_bar: ProgressBarPrimitiveSchema.optional(),
    toggle: TogglePrimitiveSchema.optional(),
  })
  .catchall(CustomPrimitiveEntrySchema);

export const CustomStepSchema = BaseStepSchema.extend({
  type: z.literal("custom"),
  layout: z
    .object({
      preset: CustomLayoutPresetSchema,
      bg: LayoutBgSchema.optional(),
      fontFamily: TextFontFamilySchema.optional(),
      safeArea: z.boolean().optional(),
    })
    .strict(),
  primitives: CustomPrimitivesSchema,
});

export {
  SlotSchema as CustomPrimitiveSlotSchema,
  CTAButtonVariantSchema as CustomCTAButtonVariantSchema,
};
export type CustomPrimitiveSlot = Slot;
export type CustomCTAButtonVariant = CTAButtonVariant;
export type CustomPrimitives = z.infer<typeof CustomPrimitivesSchema>;
export type CustomStep = z.infer<typeof CustomStepSchema>;
