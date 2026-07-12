import { z } from "zod";
import {
  LAYOUT_BG_GRADIENT_PRESET_VALUES,
  LAYOUT_PRESET_VALUES,
} from "./types";
import { TextFontFamilySchema } from "../primitives";

export const LayoutPresetSchema = z.enum(LAYOUT_PRESET_VALUES);
export const LayoutBgGradientPresetSchema = z.enum(
  LAYOUT_BG_GRADIENT_PRESET_VALUES,
);

/** A single gradient color stop; `position` is 0..1 along the gradient line. */
export const GradientStopSchema = z
  .object({
    color: z.string().trim().min(1),
    position: z.number().min(0).max(1).optional(),
  })
  .strict();

export const LayoutBgSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("solid"),
      color: z.string(),
    })
    .strict(),
  z
    .object({
      type: z.literal("linear_gradient"),
      // A named preset (backward compatible) OR a custom gradient defined by an
      // angle + 2–4 stops. At least one of `preset`/`stops` should be present;
      // renderers fall back gracefully if neither is.
      preset: LayoutBgGradientPresetSchema.optional(),
      angle: z.number().min(0).max(360).optional(),
      stops: z.array(GradientStopSchema).min(2).max(4).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("image"),
      src: z.string().url().optional(),
      bucket: z.string().trim().min(1).optional(),
      path: z.string().trim().min(1).optional(),
      resizeMode: z.enum(["cover", "contain"]).optional(),
      overlayColor: z.string().optional(),
      overlayOpacity: z.number().min(0).max(1).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("video"),
      src: z.string().url().optional(),
      bucket: z.string().trim().min(1).optional(),
      path: z.string().trim().min(1).optional(),
      resizeMode: z.enum(["cover", "contain"]).optional(),
    })
    .strict(),
]);

export const LayoutConfigSchema = z.object({
  preset: LayoutPresetSchema.optional(),
  bg: LayoutBgSchema.optional(),
  fontFamily: TextFontFamilySchema.optional(),
  safeArea: z.boolean().optional(),
});
