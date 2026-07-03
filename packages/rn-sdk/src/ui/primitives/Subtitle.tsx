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

export function Subtitle(props: {
  text: string;
  size?: "sm" | "md";
  align?: "left" | "center";
  color?: string;
  fontFamily?: OnbornFontFamily;
  fontWeight?: OnbornFontWeight;
  lineHeight?: OnbornLineHeight;
}) {
  const { scaleFont } = useResponsiveScale();
  const fontSize = scaleFont(props.size === "sm" ? 14 : 16);
  return (
    <YStack
      width="100%"
      alignItems={props.align === "left" ? "flex-start" : "center"}
    >
      <Text
        fontSize={fontSize}
        lineHeight={resolveTextLineHeight(fontSize, props.lineHeight)}
        color={props.color ?? "#9CA5B3"}
        textAlign={props.align === "left" ? "left" : "center"}
        {...resolveTextFontStyle({
          fontFamily: props.fontFamily,
          fontWeight: props.fontWeight ?? "400",
        })}
      >
        {props.text}
      </Text>
    </YStack>
  );
}
