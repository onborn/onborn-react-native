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
  SkipButtonPrimitiveSchema,
  SlotSchema,
  SubtitlePrimitiveSchema,
  TextFontFamilySchema,
  TitlePrimitiveSchema,
  XStackPrimitiveSchema,
  YStackPrimitiveSchema,
  type CTAButtonVariant,
  type Slot,
} from "../../primitives";
import {
  BENEFITS_LAYOUT_PRESET_VALUES,
  BENEFITS_PRIMITIVE_VALUES,
} from "./types";

export const BenefitsPrimitiveSchema = z.enum(BENEFITS_PRIMITIVE_VALUES);

export const BenefitsLayoutPresetSchema = z.enum(
  BENEFITS_LAYOUT_PRESET_VALUES,
);

const BenefitsPrimitiveEntrySchema = z.union([
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
  FeaturesPrimitiveSchema,
]);

export const BenefitsPrimitivesSchema = z
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
    features: FeaturesPrimitiveSchema.optional(),
  })
  .catchall(BenefitsPrimitiveEntrySchema);

export const BenefitsStepSchema = BaseStepSchema.extend({
  type: z.literal("benefits"),
  layout: z
    .object({
      preset: BenefitsLayoutPresetSchema,
      bg: LayoutBgSchema.optional(),
      fontFamily: TextFontFamilySchema.optional(),
      safeArea: z.boolean().optional(),
    })
    .strict(),
  primitives: BenefitsPrimitivesSchema,
});

export {
  SlotSchema as BenefitsPrimitiveSlotSchema,
  CTAButtonVariantSchema as BenefitsCTAButtonVariantSchema,
};
export type BenefitsPrimitiveSlot = Slot;
export type BenefitsCTAButtonVariant = CTAButtonVariant;
export type BenefitsPrimitives = z.infer<typeof BenefitsPrimitivesSchema>;
export type BenefitsStep = z.infer<typeof BenefitsStepSchema>;
