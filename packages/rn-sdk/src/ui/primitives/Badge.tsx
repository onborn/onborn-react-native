import React from "react";
import { Text, XStack } from "tamagui";
import type {
  PhosphorIconName,
  PhosphorIconWeight,
} from "@onborn/sdk-contracts";
import { useResponsiveScale } from "../responsive";
import {
  resolveTextFontStyle,
  resolveTextLineHeight,
  type OnbornFontFamily,
  type OnbornFontWeight,
  type OnbornLineHeight,
} from "../typography/fonts";
import { PHOSPHOR_ICONS } from "./phosphorIcons";

export function Badge(props: {
  text: string;
  bg?: string;
  color?: string;
  borderRadius?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  fontSize?: number;
  fontFamily?: OnbornFontFamily;
  fontWeight?: OnbornFontWeight;
  lineHeight?: OnbornLineHeight;
  iconName?: PhosphorIconName;
  iconColor?: string;
  iconSize?: number;
  iconWeight?: PhosphorIconWeight;
  iconGap?: number;
}) {
  const { scaleFont, scaleImage, scaleRadius, scaleSpace } =
    useResponsiveScale();
  const fontSize = scaleFont(props.fontSize ?? 13);
  const IconComponent = props.iconName
    ? (PHOSPHOR_ICONS[props.iconName] ?? null)
    : null;

  return (
    <XStack
      alignSelf="center"
      alignItems="center"
      justifyContent="center"
      gap={scaleSpace(props.iconGap ?? 6)}
      backgroundColor={props.bg ?? "#E0F2FE"}
      borderRadius={scaleRadius(props.borderRadius ?? 999)}
      paddingHorizontal={scaleSpace(props.paddingHorizontal ?? 12)}
      paddingVertical={scaleSpace(props.paddingVertical ?? 6)}
    >
      {IconComponent ? (
        <IconComponent
          color={props.iconColor ?? props.color ?? "#0369A1"}
          size={scaleImage(props.iconSize ?? Math.max(12, props.fontSize ?? 13))}
          weight={props.iconWeight ?? "fill"}
        />
      ) : null}
      <Text
        color={props.color ?? "#0369A1"}
        fontSize={fontSize}
        lineHeight={resolveTextLineHeight(fontSize, props.lineHeight)}
        {...resolveTextFontStyle({
          fontFamily: props.fontFamily,
          fontWeight: props.fontWeight ?? "600",
        })}
      >
        {props.text}
      </Text>
    </XStack>
  );
}
