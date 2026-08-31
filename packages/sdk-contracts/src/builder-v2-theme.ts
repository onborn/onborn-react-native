import { z } from "zod";

export const BUILDER_V2_THEME_FILE_PATH = "theme.ts";
export const BUILDER_V2_THEME_SCHEMA_VERSION = 1 as const;

/*
 * Six digits, or eight when the colour carries alpha.
 *
 * Six-only was the whole palette's rule, and it had no answer for the colours
 * a screen genuinely needs translucent: a shadow, a scrim over a photograph,
 * a hairline that has to sit on two backgrounds. A run died on exactly that —
 * `custom.shadow` written with alpha, rejected by this regex, and the failure
 * surfaced as a broken theme file rather than as a missing feature. React
 * Native and CSS both read #RRGGBBAA natively, so the shorter rule was ours
 * alone.
 */
const ThemeColorSchema = z
  .string()
  .trim()
  .regex(
    /^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/,
    "Theme colors must be hex values: #RRGGBB, or #RRGGBBAA when the colour carries alpha",
  );

/**
 * One role in the type scale, complete enough to author a screen from.
 *
 * Family and weight alone were not a scale: every generated screen wrote its
 * own `fontSize: 38, lineHeight: 43, letterSpacing: -0.7` as literals, so no
 * two screens agreed on a heading size, the theme card had nothing to show,
 * and the style menu had no token to offer. Size, leading and tracking belong
 * to the system for exactly the reason the palette does.
 */
const ThemeFontSchema = z
  .object({
    fontFamily: z.string().trim().min(1).max(120),
    fontWeight: z.enum(["400", "500", "600", "700", "800", "900"]),
    fontSize: z.number().finite().min(8).max(96),
    /**
     * Absolute, not a ratio: React Native's `lineHeight` is in points, and a
     * ratio would have to be resolved at every use site.
     */
    lineHeight: z.number().finite().min(8).max(160),
    letterSpacing: z.number().finite().min(-4).max(12),
  })
  .strict();

/**
 * A colour the agent added because a screen needed one the base palette lacks.
 *
 * The base palette was the only palette, so a second screen of a recreated
 * product whose CTA was a different colour had one legal move: rewrite
 * `primary`. It did, and the first screen — which read `primary` too —
 * changed colour underneath the person who had just approved it. Custom
 * colours are the other move: the token is added beside the base ones, named
 * for what it is rather than where it was first used ("accentLavender", not
 * "paywallCta"), and every later screen that needs the same colour finds it
 * here instead of declaring it again.
 *
 * Bounded and strictly named: a palette that grows one token per screen is
 * not a palette.
 */
const CustomColorNameSchema = z
  .string()
  .regex(/^[a-z][a-zA-Z0-9]{1,39}$/, "custom colour names are camelCase identifiers");

export const BUILDER_V2_MAX_CUSTOM_COLORS = 24;

export const BuilderV2ThemeModeSchema = z
  .object({
    colors: z
      .object({
        primary: ThemeColorSchema,
        secondary: ThemeColorSchema,
        tertiary: ThemeColorSchema,
        neutral: ThemeColorSchema,
        background: ThemeColorSchema,
        surface: ThemeColorSchema,
        text: ThemeColorSchema,
        muted: ThemeColorSchema,
        border: ThemeColorSchema,
        custom: z
          .record(CustomColorNameSchema, ThemeColorSchema)
          .refine(
            (value) => Object.keys(value).length <= BUILDER_V2_MAX_CUSTOM_COLORS,
            `At most ${BUILDER_V2_MAX_CUSTOM_COLORS} custom colours`,
          )
          .optional(),
      })
      .strict(),
  })
  .strict();

export const BuilderV2ThemeSchema = z
  .object({
    schemaVersion: z.literal(BUILDER_V2_THEME_SCHEMA_VERSION),
    light: BuilderV2ThemeModeSchema,
    dark: BuilderV2ThemeModeSchema,
    typography: z
      .object({
        headline: ThemeFontSchema,
        body: ThemeFontSchema,
        label: ThemeFontSchema,
      })
      .strict(),
    /*
     * A pill is written as a very large radius — `borderRadius: 999` is the
     * React Native idiom, and the platform clamps it to half the element, so
     * the number is a shape instruction rather than a measurement. Capping at
     * 96 refused the most common button shape in mobile onboarding and killed
     * runs that asked for one, so the bound only has to stop nonsense.
     */
    radii: z
      .object({
        card: z.number().finite().min(0).max(9_999),
        button: z.number().finite().min(0).max(9_999),
        input: z.number().finite().min(0).max(9_999),
      })
      .strict(),
    spacing: z
      .object({
        screen: z.number().finite().min(0).max(160),
        section: z.number().finite().min(0).max(160),
        item: z.number().finite().min(0).max(160),
      })
      .strict(),
  })
  .strict();

export type BuilderV2ThemeMode = z.infer<typeof BuilderV2ThemeModeSchema>;
export type BuilderV2Theme = z.infer<typeof BuilderV2ThemeSchema>;

const THEME_SOURCE_PREFIX =
  'import type { BuilderV2Theme } from "@onborn/sdk-contracts/builder-v2-theme";\n\nexport const theme = ';
const THEME_SOURCE_SUFFIX = " as const satisfies BuilderV2Theme;\n";

export function serializeBuilderV2ThemeSource(theme: BuilderV2Theme): string {
  const parsed = BuilderV2ThemeSchema.parse(theme);
  return `${THEME_SOURCE_PREFIX}${JSON.stringify(
    parsed,
    null,
    2,
  )}${THEME_SOURCE_SUFFIX}`;
}

export function parseBuilderV2ThemeSource(source: string): BuilderV2Theme {
  if (
    !source.startsWith(THEME_SOURCE_PREFIX) ||
    !source.endsWith(THEME_SOURCE_SUFFIX)
  ) {
    throw new Error(
      "theme.ts must preserve the canonical Builder V2 theme source envelope.",
    );
  }
  const json = source.slice(
    THEME_SOURCE_PREFIX.length,
    source.length - THEME_SOURCE_SUFFIX.length,
  );
  return BuilderV2ThemeSchema.parse(JSON.parse(json));
}
