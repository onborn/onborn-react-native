import React from "react";
import { Text, YStack } from "tamagui";
import {
  resolveTextLineHeight,
  resolveTextFontStyle,
  type OnbornFontFamily,
  type OnbornFontWeight,
  type OnbornLineHeight,
} from "../typography/fonts";
import { useResponsiveScale } from "../responsive";

export type TitleFontWeight = OnbornFontWeight;

export function Title(props: {
  text: string;
  size?: "sm" | "md" | "lg" | "xl" | "display" | "hero";
  align?: "left" | "center" | "right";
  color?: string;
  fontFamily?: OnbornFontFamily;
  fontWeight?: TitleFontWeight;
  fontSize?: number;
  lineHeight?: OnbornLineHeight;
  letterSpacing?: number;
}) {
  const { scaleFont } = useResponsiveScale();
  const baseFontSize =
    props.fontSize ??
    (props.size === "sm"
      ? 20
      : props.size === "lg"
        ? 32
        : props.size === "xl"
          ? 40
          : props.size === "display"
            ? 48
            : props.size === "hero"
              ? 56
              : 26);
  const fontSize = scaleFont(baseFontSize);
  const align = props.align ?? "center";
  const alignItems =
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
  const textAlign =
    align === "left" ? "left" : align === "right" ? "right" : "center";

  return (
    <YStack width="100%" alignItems={alignItems}>
      <Text
        fontSize={fontSize}
        lineHeight={resolveTextLineHeight(fontSize, props.lineHeight)}
        letterSpacing={props.letterSpacing}
        color={props.color ?? "#F3F5F8"}
        textAlign={textAlign}
        {...resolveTextFontStyle({
          fontFamily: props.fontFamily,
          fontWeight: props.fontWeight ?? "700",
        })}
      >
        {props.text}
      </Text>
    </YStack>
  );
}
