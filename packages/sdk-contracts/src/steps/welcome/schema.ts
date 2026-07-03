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
  WELCOME_LAYOUT_PRESET_VALUES,
  WELCOME_PRIMITIVE_VALUES,
} from "./types";

export const WelcomePrimitiveSchema = z.enum(WELCOME_PRIMITIVE_VALUES);

export const WelcomeLayoutPresetSchema = z.enum(WELCOME_LAYOUT_PRESET_VALUES);

const WelcomePrimitiveEntrySchema = z.union([
  ImagePrimitiveSchema,
  AnimatedAssetPrimitiveSchema,
  TitlePrimitiveSchema,
  FeaturesPrimitiveSchema,
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

export const WelcomePrimitivesSchema = z
  .object({
    image: ImagePrimitiveSchema.optional(),
    animated_asset: AnimatedAssetPrimitiveSchema.optional(),
    title: TitlePrimitiveSchema.optional(),
    subtitle: SubtitlePrimitiveSchema.optional(),
    features: FeaturesPrimitiveSchema.optional(),
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
  .catchall(WelcomePrimitiveEntrySchema);

export const WelcomeStepSchema = BaseStepSchema.extend({
  type: z.literal("welcome"),
  layout: z
    .object({
      preset: WelcomeLayoutPresetSchema,
      bg: LayoutBgSchema.optional(),
      fontFamily: TextFontFamilySchema.optional(),
      safeArea: z.boolean().optional(),
    })
    .strict(),
  primitives: WelcomePrimitivesSchema,
});

export {
  SlotSchema as WelcomePrimitiveSlotSchema,
  CTAButtonVariantSchema as WelcomeCTAButtonVariantSchema,
};
export type WelcomePrimitiveSlot = Slot;
export type WelcomeCTAButtonVariant = CTAButtonVariant;
export type WelcomePrimitives = z.infer<typeof WelcomePrimitivesSchema>;
export type WelcomeStep = z.infer<typeof WelcomeStepSchema>;
