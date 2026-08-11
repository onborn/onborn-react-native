import type {
  BuilderV2UiIrDocument,
  BuilderV2UiIrNode,
} from "@onborn/sdk-contracts/builder-v2-ui-ir";
import { resolveUiIrText } from "../domain/ui-ir-document";

export type UiIrNodeCommonProps = {
  accessibilityLabel?: string;
};

/**
 * Resolves the label the same way visible text is resolved.
 *
 * It carries a localization key now rather than a finished string, so it has to
 * be read against the document and the active locale — otherwise a translated
 * screen would announce the default language, or the object itself.
 */
export function createUiIrNodeCommonProps(
  node: BuilderV2UiIrNode,
  document: BuilderV2UiIrDocument,
  locale?: string,
): UiIrNodeCommonProps {
  if (!node.accessibilityLabel) return {};
  return {
    accessibilityLabel: resolveUiIrText(
      document,
      node.accessibilityLabel,
      locale,
    ),
  };
}
