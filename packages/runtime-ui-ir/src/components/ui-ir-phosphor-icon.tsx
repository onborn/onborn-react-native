import type { ReactElement } from "react";

import type { BuilderV2UiIrNode } from "@onborn/sdk-contracts/builder-v2-ui-ir";

import type { UiIrIconRegistryPort } from "../ports/ui-ir-icon-registry";

type PhosphorIconNode = Extract<BuilderV2UiIrNode, { type: "phosphor-icon" }>;

/*
 * Icons come from the host's registry rather than a static import of the
 * whole Phosphor set; see UiIrIconRegistryPort for why. The throw stays: an
 * icon the artifact names and the host cannot supply is a wiring bug, not a
 * rendering choice.
 */
export function UiIrPhosphorIcon(props: {
  node: PhosphorIconNode;
  icons: UiIrIconRegistryPort;
}): ReactElement {
  const Icon = props.icons.resolve(props.node.name);
  if (!Icon) {
    throw new Error(
      `UI IR Phosphor icon "${props.node.name}" is not provided by the host's icon registry.`,
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
