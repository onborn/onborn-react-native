import React from "react";
import { Text } from "tamagui";
import type { PaywallPrimitiveComponentProps } from "./types";

export function LegalText({ ctx, props }: PaywallPrimitiveComponentProps) {
  const { flowTheme } = ctx;
  const legal = props as {
    text?: string;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    textAlign?: "left" | "center" | "right";
    maxWidth?: number;
  };
  const fontSize = legal.fontSize ?? 11;
  return (
    <Text
      width="100%"
      maxWidth={legal.maxWidth}
      alignSelf="center"
      textAlign={legal.textAlign ?? "center"}
      color={ctx.resolveColor(legal.color) ?? flowTheme.colors.secondary}
      fontSize={fontSize}
      lineHeight={fontSize * 1.35}
      fontFamily={
        legal.fontFamily ?? flowTheme.fonts.body ?? ctx.layoutFontFamily
      }
      fontWeight={legal.fontWeight ?? "400"}
    >
      {legal.text ?? "Subscription renews automatically unless canceled."}
    </Text>
  );
}
