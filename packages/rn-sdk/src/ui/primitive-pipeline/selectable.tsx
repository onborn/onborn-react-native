import React from "react";
import { Pressable } from "react-native";
import type { ViewStyle } from "react-native";
import type { PrimitiveRenderOptions } from "./types";

/**
 * Builder-only selection wrapper. `display: contents` generates no layout box,
 * so wrapping a primitive for selection does NOT change its position or size —
 * the screen looks identical whether or not selection mode is active. Bubbled
 * clicks from the primitive still reach this Pressable's handler. This path only
 * renders on web in the builder (native passes no `onPrimitivePress`).
 */
const SELECTABLE_WRAPPER_STYLE = {
  display: "contents",
} as unknown as ViewStyle;

export function wrapSelectableNode(
  key: string,
  primitiveId: string,
  node: React.ReactNode,
  options?: PrimitiveRenderOptions,
): React.ReactNode {
  if (!options?.onPrimitivePress) {
    return <React.Fragment key={key}>{node}</React.Fragment>;
  }

  return (
    <Pressable
      key={key}
      onPress={(event) => {
        event.stopPropagation();
        options.onPrimitivePress?.(toSelectablePrimitiveId(primitiveId, options));
      }}
      style={SELECTABLE_WRAPPER_STYLE}
    >
      {node}
    </Pressable>
  );
}

export function toSelectablePrimitiveId(
  primitiveId: string,
  options?: PrimitiveRenderOptions,
): string {
  return options?.selectableIdPrefix
    ? `${options.selectableIdPrefix}${primitiveId}`
    : primitiveId;
}
