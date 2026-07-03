import { z } from "zod";
import { LayoutBgSchema } from "../../layout";
import {
  AgePickerPrimitiveSchema,
  AnimatedAssetPrimitiveSchema,
  BackButtonPrimitiveSchema,
  BadgePrimitiveSchema,
  CTAButtonPrimitiveSchema,
  CTAButtonVariantSchema,
  HeightPickerPrimitiveSchema,
  IconPrimitiveSchema,
  ProgressBarPrimitiveSchema,
  SkipButtonPrimitiveSchema,
  SlotSchema,
  SubtitlePrimitiveSchema,
  TextFontFamilySchema,
  TitlePrimitiveSchema,
  WeightPickerPrimitiveSchema,
  XStackPrimitiveSchema,
  YStackPrimitiveSchema,
  type CTAButtonVariant,
  type Slot,
} from "../../primitives";
import { BaseStepSchema } from "../schema";
import {
  METRICS_LAYOUT_PRESET_VALUES,
  METRICS_PRIMITIVE_VALUES,
} from "./types";

export const MetricsPrimitiveSchema = z.enum(METRICS_PRIMITIVE_VALUES);

export const MetricsLayoutPresetSchema = z.enum(METRICS_LAYOUT_PRESET_VALUES);

const MetricsPrimitiveEntrySchema = z.union([
  AgePickerPrimitiveSchema,
  WeightPickerPrimitiveSchema,
  HeightPickerPrimitiveSchema,
  TitlePrimitiveSchema,
  SubtitlePrimitiveSchema,
  CTAButtonPrimitiveSchema,
  ProgressBarPrimitiveSchema,
  AnimatedAssetPrimitiveSchema,
  YStackPrimitiveSchema,
  XStackPrimitiveSchema,
  BadgePrimitiveSchema,
  IconPrimitiveSchema,
  BackButtonPrimitiveSchema,
  SkipButtonPrimitiveSchema,
]);

export const MetricsPrimitivesSchema = z
  .object({
    age_picker: AgePickerPrimitiveSchema.optional(),
    weight_picker: WeightPickerPrimitiveSchema.optional(),
    height_picker: HeightPickerPrimitiveSchema.optional(),
    title: TitlePrimitiveSchema.optional(),
    subtitle: SubtitlePrimitiveSchema.optional(),
    cta_button: CTAButtonPrimitiveSchema.optional(),
    progress_bar: ProgressBarPrimitiveSchema.optional(),
    animated_asset: AnimatedAssetPrimitiveSchema.optional(),
    y_stack: YStackPrimitiveSchema.optional(),
    x_stack: XStackPrimitiveSchema.optional(),
    badge: BadgePrimitiveSchema.optional(),
    icon: IconPrimitiveSchema.optional(),
    back_button: BackButtonPrimitiveSchema.optional(),
    skip_button: SkipButtonPrimitiveSchema.optional(),
  })
  .catchall(MetricsPrimitiveEntrySchema);

export const MetricsStepSchema = BaseStepSchema.extend({
  type: z.literal("metrics"),
  layout: z
    .object({
      preset: MetricsLayoutPresetSchema,
      bg: LayoutBgSchema.optional(),
      fontFamily: TextFontFamilySchema.optional(),
      safeArea: z.boolean().optional(),
    })
    .strict(),
  primitives: MetricsPrimitivesSchema,
});

export {
  SlotSchema as MetricsPrimitiveSlotSchema,
  CTAButtonVariantSchema as MetricsCTAButtonVariantSchema,
};
export type MetricsPrimitiveSlot = Slot;
export type MetricsCTAButtonVariant = CTAButtonVariant;
export type MetricsPrimitives = z.infer<typeof MetricsPrimitivesSchema>;
export type MetricsStep = z.infer<typeof MetricsStepSchema>;
