import { z } from "zod";

export const BUILDER_V2_THEME_FILE_PATH = "theme.ts";
export const BUILDER_V2_THEME_SCHEMA_VERSION = 1 as const;

const ThemeColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Theme colors must use six-digit hex values");

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
    radii: z
      .object({
        card: z.number().finite().min(0).max(96),
        button: z.number().finite().min(0).max(96),
        input: z.number().finite().min(0).max(96),
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
