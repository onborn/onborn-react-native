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
      preset: LayoutBgGradientPresetSchema,
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
