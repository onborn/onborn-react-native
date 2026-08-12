import type {
  BuilderV2UiIrDocument,
  BuilderV2UiIrScreen,
  BuilderV2UiIrText,
} from "@onborn/sdk-contracts/builder-v2-ui-ir";

export function findUiIrScreen(
  document: BuilderV2UiIrDocument,
  screenId: string,
): BuilderV2UiIrScreen {
  const screen = document.screens.find(
    (candidate) => candidate.screenId === screenId,
  );
  if (!screen) {
    throw new Error(`UI IR screen "${screenId}" is not declared.`);
  }
  return screen;
}

export function resolveUiIrText(
  document: BuilderV2UiIrDocument,
  text: BuilderV2UiIrText,
  locale?: string,
): string {
  if (text.kind === "literal") {
    return text.value;
  }
  /*
   * A price is not the document's to answer: it comes from the offering the
   * device loaded, so it is resolved where the plans are. Returning empty here
   * keeps every caller honest rather than letting one invent a placeholder.
   */
  if (text.kind === "billing") {
    return "";
  }
  const localization = document.localization;
  if (!localization) {
    return text.fallback;
  }
  const selectedLocale = locale ?? localization.defaultLocale;
  return (
    localization.resources[selectedLocale]?.[text.key] ??
    localization.resources[localization.defaultLocale]?.[text.key] ??
    text.fallback
  );
}
