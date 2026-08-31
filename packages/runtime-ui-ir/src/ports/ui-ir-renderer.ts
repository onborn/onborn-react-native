import type { UiIrIconRegistryPort } from "./ui-ir-icon-registry";
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
  /**
   * Turns the plan an artifact names into the product the store sells.
   *
   * Supplied by the pressable, which is the only place that knows both the
   * loaded offering and the screen's current selection. Absent when nothing on
   * the screen buys anything.
   */
  resolvePurchaseTarget?: (
    source: Extract<
      BuilderV2UiIrAction,
      { type: "billing.purchase" }
    >["source"],
  ) => string | undefined;
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
  /** The icons the artifact may summon by name; see UiIrIconRegistryPort. */
  icons: UiIrIconRegistryPort;
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
