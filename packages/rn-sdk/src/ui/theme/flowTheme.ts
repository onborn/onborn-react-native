import type {
  FlowTheme,
  FlowThemeButtonVariant,
  TextFontFamily,
} from "@onborn/sdk-contracts";

export const DEFAULT_FLOW_THEME: Required<FlowTheme> = {
  colors: {
    primary: "#5F6FFF",
    secondary: "#171B22",
    tertiary: "#2B3340",
    neutral: "#F3F5F8",
  },
  fonts: {
    headline: "Inter",
    body: "Inter",
    label: "Inter",
    headlineSize: 26,
    bodySize: 16,
    labelSize: 16,
    headlineLetterSpacing: 0,
    bodyLetterSpacing: 0,
    labelLetterSpacing: 0,
  },
  buttons: {
    primary: {
      bg: "#5F6FFF",
      color: "#FFFFFF",
      radius: 12,
      fontFamily: "Inter",
      fontWeight: "600",
      fontSize: 16,
      letterSpacing: 0,
    },
    secondary: {
      bg: "#171B22",
      color: "#F3F5F8",
      borderColor: "#2B3340",
      borderWidth: 1,
      radius: 12,
      fontFamily: "Inter",
      fontWeight: "600",
      fontSize: 16,
      letterSpacing: 0,
    },
    inverted: {
      bg: "#F3F5F8",
      color: "#0E1116",
      radius: 12,
      fontFamily: "Inter",
      fontWeight: "600",
      fontSize: 16,
      letterSpacing: 0,
    },
    outline: {
      bg: "transparent",
      color: "#F3F5F8",
      borderColor: "#F3F5F8",
      borderWidth: 1,
      radius: 12,
      fontFamily: "Inter",
      fontWeight: "600",
      fontSize: 16,
      letterSpacing: 0,
    },
  },
  components: {
    backButton: {
      variant: "icon_text",
      bg: "transparent",
      color: "#F3F5F8",
      borderColor: "transparent",
      borderWidth: 0,
      borderRadius: 999,
      paddingHorizontal: 0,
      paddingVertical: 0,
      iconSize: 27,
      fontSize: 15,
      fontFamily: "Inter",
      fontWeight: "600",
      lineHeight: "normal",
    },
    input: {
      bg: "#171B22",
      color: "#F3F5F8",
      placeholderColor: "#9CA5B3",
      borderColor: "#2B3340",
      borderWidth: 1,
      borderRadius: 16,
      height: 48,
      paddingHorizontal: 14,
      fontSize: 16,
      fontFamily: "Inter",
      fontWeight: "400",
      lineHeight: "normal",
    },
  },
};

export function resolveFlowTheme(theme: FlowTheme | undefined): Required<FlowTheme> {
  return {
    colors: { ...DEFAULT_FLOW_THEME.colors, ...(theme?.colors ?? {}) },
    fonts: { ...DEFAULT_FLOW_THEME.fonts, ...(theme?.fonts ?? {}) },
    buttons: {
      primary: {
        ...DEFAULT_FLOW_THEME.buttons.primary,
        ...(theme?.buttons?.primary ?? {}),
      },
      secondary: {
        ...DEFAULT_FLOW_THEME.buttons.secondary,
        ...(theme?.buttons?.secondary ?? {}),
      },
      inverted: {
        ...DEFAULT_FLOW_THEME.buttons.inverted,
        ...(theme?.buttons?.inverted ?? {}),
      },
      outline: {
        ...DEFAULT_FLOW_THEME.buttons.outline,
        ...(theme?.buttons?.outline ?? {}),
      },
    },
    components: {
      backButton: {
        ...DEFAULT_FLOW_THEME.components.backButton,
        ...(theme?.components?.backButton ?? {}),
      },
      input: {
        ...DEFAULT_FLOW_THEME.components.input,
        ...(theme?.components?.input ?? {}),
      },
    },
  };
}

export function resolveThemeToken(
  value: string | undefined,
  theme: Required<FlowTheme>,
): string | undefined {
  if (!value) {
    return value;
  }
  const match = value.match(/^\{theme\.colors\.([a-zA-Z]+)\}$/);
  if (!match) {
    return value;
  }
  const legacyKey = match[1];
  const key = (
    legacyKey === "surface"
      ? "neutral"
      : legacyKey === "text"
        ? "primary"
        : legacyKey === "mutedText"
          ? "secondary"
          : legacyKey
  ) as keyof Required<FlowTheme>["colors"];
  return theme.colors[key] ?? value;
}

export function resolveThemeFont(
  value: TextFontFamily | undefined,
  fallback: TextFontFamily,
): TextFontFamily {
  return value ?? fallback;
}

export function resolveThemeButtonStyle(
  variant: FlowThemeButtonVariant | "custom" | undefined,
  theme: Required<FlowTheme>,
) {
  if (!variant || variant === "custom") {
    return undefined;
  }
  return theme.buttons[variant];
}
