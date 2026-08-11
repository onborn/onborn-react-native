import type { BuilderV2UiIrNode } from "@onborn/sdk-contracts/builder-v2-ui-ir";

export type UiIrNodeCommonProps = {
  accessibilityLabel?: string;
};

export function createUiIrNodeCommonProps(
  node: BuilderV2UiIrNode,
): UiIrNodeCommonProps {
  return node.accessibilityLabel
    ? { accessibilityLabel: node.accessibilityLabel }
    : {};
}
