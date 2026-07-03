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
  IconPrimitiveSchema,
  ImagePrimitiveSchema,
  InputPrimitiveSchema,
  SkipButtonPrimitiveSchema,
  SlotSchema,
  SubtitlePrimitiveSchema,
  TextFontFamilySchema,
  TitlePrimitiveSchema,
  TogglePrimitiveSchema,
  XStackPrimitiveSchema,
  YStackPrimitiveSchema,
  type CTAButtonVariant,
  type Slot,
} from "../../primitives";
import {
  PERMISSIONS_LAYOUT_PRESET_VALUES,
  PERMISSIONS_PRIMITIVE_VALUES,
} from "./types";

export const PermissionsPrimitiveSchema = z.enum(PERMISSIONS_PRIMITIVE_VALUES);

export const PermissionsLayoutPresetSchema = z.enum(
  PERMISSIONS_LAYOUT_PRESET_VALUES,
);

const PermissionsPrimitiveEntrySchema = z.union([
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
  TogglePrimitiveSchema,
]);

export const PermissionsPrimitivesSchema = z
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
    toggle: TogglePrimitiveSchema.optional(),
  })
  .catchall(PermissionsPrimitiveEntrySchema);

export const PermissionsStepSchema = BaseStepSchema.extend({
  type: z.literal("permissions"),
  layout: z
    .object({
      preset: PermissionsLayoutPresetSchema,
      bg: LayoutBgSchema.optional(),
      fontFamily: TextFontFamilySchema.optional(),
      safeArea: z.boolean().optional(),
    })
    .strict(),
  primitives: PermissionsPrimitivesSchema,
});

export {
  SlotSchema as PermissionsPrimitiveSlotSchema,
  CTAButtonVariantSchema as PermissionsCTAButtonVariantSchema,
};
export type PermissionsPrimitiveSlot = Slot;
export type PermissionsCTAButtonVariant = CTAButtonVariant;
export type PermissionsPrimitives = z.infer<typeof PermissionsPrimitivesSchema>;
export type PermissionsStep = z.infer<typeof PermissionsStepSchema>;
