/**
 * `{{name}}` or `{{name|fallback}}` inside any text the artifact carries.
 *
 * What a person typed on one screen can be spoken back on a later one — "Nice
 * to meet you, Anna." — and the artifact is static, so the copy carries a
 * placeholder and the runtime fills it from the journey's answers. The
 * fallback covers the person who skipped the field; without one the
 * placeholder renders as nothing, never as its own braces.
 */
export const BUILDER_V2_UI_IR_PLACEHOLDER_PATTERN =
  /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\|([^{}]*))?\}\}/g;

export type BuilderV2UiIrPlaceholder = {
  name: string;
  fallback: string | null;
};

export function readBuilderV2UiIrPlaceholders(
  text: string,
): BuilderV2UiIrPlaceholder[] {
  return [...text.matchAll(BUILDER_V2_UI_IR_PLACEHOLDER_PATTERN)].map(
    (match) => ({
      name: match[1]!,
      fallback: match[2] === undefined ? null : match[2].trim(),
    }),
  );
}

export function resolveBuilderV2UiIrPlaceholders(
  text: string,
  variables: Readonly<Record<string, string | null | undefined>>,
): string {
  if (!text.includes("{{")) return text;
  return text.replace(
    BUILDER_V2_UI_IR_PLACEHOLDER_PATTERN,
    (_match, name: string, fallback: string | undefined) => {
      const value = variables[name];
      return typeof value === "string" && value.trim() !== ""
        ? value.trim()
        : (fallback?.trim() ?? "");
    },
  );
}
