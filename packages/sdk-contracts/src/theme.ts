import { z } from "zod";
import {
  TextFontSizeSchema,
  TextFontFamilySchema,
  TextLetterSpacingSchema,
  TextLineHeightSchema,
  TextFontWeightSchema,
} from "./primitives";

export const FlowThemeButtonVariantSchema = z.enum([
  "primary",
  "secondary",
  "inverted",
  "outline",
]);

export const FlowThemeColorsSchema = z
  .object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    tertiary: z.string().optional(),
    neutral: z.string().optional(),
  })
  .strict();

export const FlowThemeFontsSchema = z
  .object({
    headline: TextFontFamilySchema.optional(),
    body: TextFontFamilySchema.optional(),
    label: TextFontFamilySchema.optional(),
    headlineSize: TextFontSizeSchema.optional(),
    bodySize: TextFontSizeSchema.optional(),
    labelSize: z.number().min(8).max(64).optional(),
    headlineLetterSpacing: TextLetterSpacingSchema.optional(),
    bodyLetterSpacing: TextLetterSpacingSchema.optional(),
    labelLetterSpacing: TextLetterSpacingSchema.optional(),
  })
  .strict();

export const FlowThemeButtonStyleSchema = z
  .object({
    bg: z.string().optional(),
    color: z.string().optional(),
    borderColor: z.string().optional(),
    borderWidth: z.number().min(0).max(12).optional(),
    radius: z.number().min(0).max(999).optional(),
    fontFamily: TextFontFamilySchema.optional(),
    fontWeight: TextFontWeightSchema.optional(),
    fontSize: z.number().min(8).max(64).optional(),
    letterSpacing: TextLetterSpacingSchema.optional(),
  })
  .strict();

export const FlowThemeButtonsSchema = z
  .object({
    primary: FlowThemeButtonStyleSchema.optional(),
    secondary: FlowThemeButtonStyleSchema.optional(),
    inverted: FlowThemeButtonStyleSchema.optional(),
    outline: FlowThemeButtonStyleSchema.optional(),
  })
  .strict();

export const FlowThemeBackButtonSchema = z
  .object({
    variant: z.enum(["icon", "icon_text"]).optional(),
    bg: z.string().optional(),
    color: z.string().optional(),
    borderColor: z.string().optional(),
    borderWidth: z.number().min(0).max(12).optional(),
    borderRadius: z.number().min(0).max(999).optional(),
    paddingHorizontal: z.number().min(0).max(96).optional(),
    paddingVertical: z.number().min(0).max(64).optional(),
    iconSize: z.number().min(4).max(128).optional(),
    fontSize: z.number().min(8).max(64).optional(),
    fontFamily: TextFontFamilySchema.optional(),
    fontWeight: TextFontWeightSchema.optional(),
    lineHeight: TextLineHeightSchema.optional(),
  })
  .strict();

export const FlowThemeInputSchema = z
  .object({
    bg: z.string().optional(),
    color: z.string().optional(),
    placeholderColor: z.string().optional(),
    borderColor: z.string().optional(),
    borderWidth: z.number().min(0).max(12).optional(),
    borderRadius: z.number().min(0).max(999).optional(),
    height: z.number().min(24).max(180).optional(),
    paddingHorizontal: z.number().min(0).max(64).optional(),
    fontSize: z.number().min(8).max(64).optional(),
    fontFamily: TextFontFamilySchema.optional(),
    fontWeight: TextFontWeightSchema.optional(),
    lineHeight: TextLineHeightSchema.optional(),
  })
  .strict();

export const FlowThemeComponentsSchema = z
  .object({
    backButton: FlowThemeBackButtonSchema.optional(),
    input: FlowThemeInputSchema.optional(),
  })
  .strict();

const FlowThemeObjectSchema = z
  .object({
    colors: FlowThemeColorsSchema.optional(),
    fonts: FlowThemeFontsSchema.optional(),
    buttons: FlowThemeButtonsSchema.optional(),
    components: FlowThemeComponentsSchema.optional(),
  })
  .strict();

export const FlowThemeSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const rest = { ...(value as Record<string, unknown>) };
  delete rest.icons;
  return rest;
}, FlowThemeObjectSchema);

export type FlowThemeButtonVariant = z.infer<
  typeof FlowThemeButtonVariantSchema
>;
export type FlowTheme = z.infer<typeof FlowThemeSchema>;

const THEME_COLOR_TOKEN_PATTERN = /^\{theme\.colors\.[a-zA-Z]+\}$/;

export function isThemeColorToken(value: string | undefined): boolean {
  return typeof value === "string" && THEME_COLOR_TOKEN_PATTERN.test(value);
}

export function isThemeLinkedCtaVariant(
  variant: unknown,
): variant is FlowThemeButtonVariant {
  return (
    typeof variant === "string" &&
    (FlowThemeButtonVariantSchema.options as readonly string[]).includes(
      variant,
    )
  );
}

const CTA_THEME_STYLE_PROP_KEYS = [
  "bg",
  "color",
  "borderColor",
  "borderWidth",
  "borderRadius",
  "fontFamily",
  "fontWeight",
  "fontSize",
  "letterSpacing",
  "iconColor",
] as const;

/** Clear non-token style overrides when resetting a CTA to a theme-linked variant. */
export function sanitizeThemeLinkedCtaProps(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const variant = props.variant;
  if (!isThemeLinkedCtaVariant(variant)) {
    return props;
  }

  const next = { ...props };
  for (const key of CTA_THEME_STYLE_PROP_KEYS) {
    const value = next[key];
    if (
      (key === "bg" ||
        key === "color" ||
        key === "borderColor" ||
        key === "iconColor") &&
      typeof value === "string" &&
      isThemeColorToken(value)
    ) {
      continue;
    }
    delete next[key];
  }
  return next;
}
