import React from "react";
import { Text } from "tamagui";
import type { PaywallPrimitiveComponentProps } from "./types";
import { isBuilderCanvasPreview } from "./utils";

export function RestorePurchasesButton({
  ctx,
  props,
}: PaywallPrimitiveComponentProps) {
  const { flowTheme } = ctx;
  const restore = props as {
    text?: string;
    variant?: "text" | "link" | "ghost";
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
  };
  const isLink = restore.variant === "link";
  return (
    <Text
      maxWidth="100%"
      alignSelf="center"
      textAlign="center"
      color={ctx.resolveColor(restore.color) ?? flowTheme.colors.secondary}
      fontSize={restore.fontSize ?? 13}
      fontFamily={
        restore.fontFamily ?? flowTheme.fonts.label ?? ctx.layoutFontFamily
      }
      fontWeight={restore.fontWeight ?? "600"}
      textDecorationLine={isLink ? "underline" : "none"}
      paddingVertical={8}
      paddingHorizontal={0}
      opacity={ctx.options?.paywallContext?.restoring ? 0.72 : 1}
      onPress={
        isBuilderCanvasPreview(ctx.options)
          ? undefined
          : ctx.options?.paywallContext?.onRestorePurchases
      }
    >
      {restore.text ?? "Restore purchases"}
    </Text>
  );
}
