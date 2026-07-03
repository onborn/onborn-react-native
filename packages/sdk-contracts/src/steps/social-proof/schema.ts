import { z } from "zod";
import { LayoutBgSchema } from "../../layout";
import {
  AnimatedAssetPrimitiveSchema,
  AvatarPrimitiveSchema,
  BadgePrimitiveSchema,
  CarouselPaginationPrimitiveSchema,
  CarouselPrimitiveSchema,
  CTAButtonPrimitiveSchema,
  CTAButtonVariantSchema,
  FeaturesPrimitiveSchema,
  IconPrimitiveSchema,
  ImagePrimitiveSchema,
  SkipButtonPrimitiveSchema,
  SlotSchema,
  SubtitlePrimitiveSchema,
  TestimonialCardPrimitiveSchema,
  TextFontFamilySchema,
  TitlePrimitiveSchema,
  XStackPrimitiveSchema,
  YStackPrimitiveSchema,
  type CTAButtonVariant,
  type Slot,
} from "../../primitives";
import { BaseStepSchema } from "../schema";
import {
  SOCIAL_PROOF_LAYOUT_PRESET_VALUES,
  SOCIAL_PROOF_PRIMITIVE_VALUES,
} from "./types";

export const SocialProofPrimitiveSchema = z.enum(
  SOCIAL_PROOF_PRIMITIVE_VALUES,
);

export const SocialProofLayoutPresetSchema = z.enum(
  SOCIAL_PROOF_LAYOUT_PRESET_VALUES,
);

const SocialProofPrimitiveEntrySchema = z.union([
  ImagePrimitiveSchema,
  AnimatedAssetPrimitiveSchema,
  TitlePrimitiveSchema,
  SubtitlePrimitiveSchema,
  CTAButtonPrimitiveSchema,
  CarouselPrimitiveSchema,
  CarouselPaginationPrimitiveSchema,
  TestimonialCardPrimitiveSchema,
  FeaturesPrimitiveSchema,
  AvatarPrimitiveSchema,
  BadgePrimitiveSchema,
  SkipButtonPrimitiveSchema,
  IconPrimitiveSchema,
  XStackPrimitiveSchema,
  YStackPrimitiveSchema,
]);

export const SocialProofPrimitivesSchema = z
  .object({
    image: ImagePrimitiveSchema.optional(),
    animated_asset: AnimatedAssetPrimitiveSchema.optional(),
    title: TitlePrimitiveSchema.optional(),
    subtitle: SubtitlePrimitiveSchema.optional(),
    cta_button: CTAButtonPrimitiveSchema.optional(),
    carousel: CarouselPrimitiveSchema.optional(),
    carousel_pagination: CarouselPaginationPrimitiveSchema.optional(),
    testimonial_card: TestimonialCardPrimitiveSchema.optional(),
    features: FeaturesPrimitiveSchema.optional(),
    avatar: AvatarPrimitiveSchema.optional(),
    badge: BadgePrimitiveSchema.optional(),
    skip_button: SkipButtonPrimitiveSchema.optional(),
    icon: IconPrimitiveSchema.optional(),
    x_stack: XStackPrimitiveSchema.optional(),
    y_stack: YStackPrimitiveSchema.optional(),
  })
  .catchall(SocialProofPrimitiveEntrySchema);

export const SocialProofStepSchema = BaseStepSchema.extend({
  type: z.literal("social_proof"),
  layout: z
    .object({
      preset: SocialProofLayoutPresetSchema,
      bg: LayoutBgSchema.optional(),
      fontFamily: TextFontFamilySchema.optional(),
      safeArea: z.boolean().optional(),
    })
    .strict(),
  primitives: SocialProofPrimitivesSchema,
});

export {
  SlotSchema as SocialProofPrimitiveSlotSchema,
  CTAButtonVariantSchema as SocialProofCTAButtonVariantSchema,
};
export type SocialProofPrimitiveSlot = Slot;
export type SocialProofCTAButtonVariant = CTAButtonVariant;
export type SocialProofPrimitives = z.infer<
  typeof SocialProofPrimitivesSchema
>;
export type SocialProofStep = z.infer<typeof SocialProofStepSchema>;
