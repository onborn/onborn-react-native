import { z } from "zod";
import { LayoutBgSchema } from "../../layout";
import {
  AnimatedAssetPrimitiveSchema,
  BadgePrimitiveSchema,
  CarouselPaginationPrimitiveSchema,
  CarouselPrimitiveSchema,
  IconPrimitiveSchema,
  ImagePrimitiveSchema,
  LoadingPrimitiveSchema,
  SlotSchema,
  SubtitlePrimitiveSchema,
  TextFontFamilySchema,
  TitlePrimitiveSchema,
  type Slot,
  XStackPrimitiveSchema,
  YStackPrimitiveSchema,
} from "../../primitives";
import { BaseStepSchema } from "../schema";
import {
  LOADING_LAYOUT_PRESET_VALUES,
  LOADING_PRIMITIVE_VALUES,
} from "./types";

export const LoadingStepPrimitiveSchema = z.enum(LOADING_PRIMITIVE_VALUES);

export const LoadingLayoutPresetSchema = z.enum(
  LOADING_LAYOUT_PRESET_VALUES,
);

const LoadingPrimitiveEntrySchema = z.union([
  LoadingPrimitiveSchema,
  TitlePrimitiveSchema,
  SubtitlePrimitiveSchema,
  ImagePrimitiveSchema,
  AnimatedAssetPrimitiveSchema,
  IconPrimitiveSchema,
  BadgePrimitiveSchema,
  CarouselPrimitiveSchema,
  CarouselPaginationPrimitiveSchema,
  XStackPrimitiveSchema,
  YStackPrimitiveSchema,
]);

export const LoadingPrimitivesSchema = z
  .object({
    loading: LoadingPrimitiveSchema.optional(),
    title: TitlePrimitiveSchema.optional(),
    subtitle: SubtitlePrimitiveSchema.optional(),
    image: ImagePrimitiveSchema.optional(),
    animated_asset: AnimatedAssetPrimitiveSchema.optional(),
    icon: IconPrimitiveSchema.optional(),
    badge: BadgePrimitiveSchema.optional(),
    carousel: CarouselPrimitiveSchema.optional(),
    carousel_pagination: CarouselPaginationPrimitiveSchema.optional(),
    x_stack: XStackPrimitiveSchema.optional(),
    y_stack: YStackPrimitiveSchema.optional(),
  })
  .catchall(LoadingPrimitiveEntrySchema);

export const LoadingStepSchema = BaseStepSchema.extend({
  type: z.literal("loading"),
  layout: z
    .object({
      preset: LoadingLayoutPresetSchema,
      bg: LayoutBgSchema.optional(),
      fontFamily: TextFontFamilySchema.optional(),
      safeArea: z.boolean().optional(),
    })
    .strict(),
  primitives: LoadingPrimitivesSchema,
});

export { SlotSchema as LoadingPrimitiveSlotSchema };
export type LoadingPrimitiveSlot = Slot;
export type LoadingPrimitives = z.infer<typeof LoadingPrimitivesSchema>;
export type LoadingStep = z.infer<typeof LoadingStepSchema>;
