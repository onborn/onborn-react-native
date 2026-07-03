import { z } from "zod";
import { LayoutBgSchema } from "../../layout";
import { TextFontFamilySchema } from "../../primitives";
import { CustomPrimitivesSchema } from "../custom/schema";
import { BaseStepSchema } from "../schema";
import { NATIVE_CUSTOM_LAYOUT_PRESET_VALUES } from "./types";

export const NativeCustomLayoutPresetSchema = z.enum(
  NATIVE_CUSTOM_LAYOUT_PRESET_VALUES,
);

export const NativeCustomStepSchema = BaseStepSchema.extend({
  type: z.literal("native_custom"),
  layout: z
    .object({
      preset: NativeCustomLayoutPresetSchema,
      bg: LayoutBgSchema.optional(),
      fontFamily: TextFontFamilySchema.optional(),
      safeArea: z.boolean().optional(),
    })
    .strict(),
  native: z
    .object({
      rendererKey: z.string().trim().min(1),
      props: z.record(z.string(), z.unknown()).optional(),
    })
    .strict(),
  primitives: CustomPrimitivesSchema,
});

export type NativeCustomStep = z.infer<typeof NativeCustomStepSchema>;
