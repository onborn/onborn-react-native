import type { ReactElement, ReactNode } from "react";
import type { ImageSourcePropType } from "react-native";

import type {
  BuilderV2UiIrAction,
  BuilderV2UiIrAsset,
  BuilderV2UiIrJsonValue,
  BuilderV2UiIrNode,
} from "@onborn/sdk-contracts/builder-v2-ui-ir";

export type UiIrActionContext = {
  screenId: string;
  nodeId: string;
  action: BuilderV2UiIrAction;
};

export type UiIrCapabilityRenderInput = {
  screenId: string;
  nodeId: string;
  capability: string;
  component: string;
  props: BuilderV2UiIrJsonValue;
};

export type UiIrNodeDecorationInput = {
  screenId: string;
  node: BuilderV2UiIrNode;
  element: ReactElement;
};

export type UiIrRendererPorts = {
  resolveAsset: (asset: BuilderV2UiIrAsset) => ImageSourcePropType;
  handleAction: (context: UiIrActionContext) => void | Promise<void>;
  renderCapability: (input: UiIrCapabilityRenderInput) => ReactNode;
  decorateNode?: (input: UiIrNodeDecorationInput) => ReactElement;
};

export function decorateRenderedUiIrNode(
  ports: Pick<UiIrRendererPorts, "decorateNode">,
  input: UiIrNodeDecorationInput,
): ReactElement {
  return ports.decorateNode?.(input) ?? input.element;
}
