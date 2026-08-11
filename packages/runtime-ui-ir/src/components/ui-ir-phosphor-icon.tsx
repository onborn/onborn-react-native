import type { ComponentType, ReactElement } from "react";

import * as PhosphorIcons from "phosphor-react-native";
import type { IconProps } from "phosphor-react-native";

import type { BuilderV2UiIrNode } from "@onborn/sdk-contracts/builder-v2-ui-ir";

type PhosphorIconNode = Extract<
  BuilderV2UiIrNode,
  { type: "phosphor-icon" }
>;

const iconRegistry = PhosphorIcons as unknown as Readonly<
  Record<string, ComponentType<IconProps> | undefined>
>;

export function UiIrPhosphorIcon(props: {
  node: PhosphorIconNode;
}): ReactElement {
  const Icon = iconRegistry[props.node.name];
  if (!Icon) {
    throw new Error(
      `UI IR Phosphor icon "${props.node.name}" is unavailable in the runtime.`,
    );
  }
  return (
    <Icon
      color={props.node.color}
      mirrored={props.node.mirrored}
      size={props.node.size}
      style={props.node.style}
      weight={props.node.weight}
    />
  );
}
