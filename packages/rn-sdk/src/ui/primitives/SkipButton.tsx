import React from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { Button, Text, XStack } from "tamagui";
import type {
  CTAButtonIconPosition,
  PhosphorIconName,
  PhosphorIconWeight,
  SkipButtonVariant,
} from "@onborn/sdk-contracts";
import { ArrowRight, type IconWeight } from "phosphor-react-native";
import {
  resolveTextFontStyle,
  resolveTextLineHeight,
  type OnbornFontFamily,
  type OnbornFontWeight,
  type OnbornLineHeight,
} from "../typography/fonts";
import { useResponsiveScale } from "../responsive";
import { PHOSPHOR_ICONS } from "./phosphorIcons";

export function SkipButton(props: {
  variant?: SkipButtonVariant;
  text?: string;
  iconName?: PhosphorIconName;
  iconPosition?: CTAButtonIconPosition;
  color?: string;
  bg?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  fontSize?: number;
  fontFamily?: OnbornFontFamily;
  fontWeight?: OnbornFontWeight;
  lineHeight?: OnbornLineHeight;
  iconColor?: string;
  iconSize?: number;
  iconWeight?: PhosphorIconWeight;
  onPress?: () => void;
  disableInteractionState?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { scaleFont, scaleImage, scaleRadius, scaleSpace } =
    useResponsiveScale();
  const variant = props.variant ?? "icon_text";
  const showIcon = variant === "icon" || variant === "icon_text";
  const showText = variant === "text" || variant === "icon_text";
  const fg = props.color ?? "#64748B";
  const bg = props.bg ?? "transparent";
  const radius = scaleRadius(props.borderRadius ?? 999);
  const textFontSize = scaleFont(props.fontSize ?? 14);
  const textLineHeight =
    resolveTextLineHeight(textFontSize, props.lineHeight) ??
    Math.round(textFontSize * 1.25);
  const IconComponent = showIcon
    ? props.iconName
      ? (PHOSPHOR_ICONS[props.iconName] ?? ArrowRight)
      : ArrowRight
    : null;
  const icon = IconComponent ? (
    <IconComponent
      color={props.iconColor ?? fg}
      size={scaleImage(props.iconSize ?? 18)}
      weight={(props.iconWeight ?? "bold") as IconWeight}
    />
  ) : null;

  return (
    <XStack alignItems="center" flexShrink={0}>
      <Button
        unstyled
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        gap={scaleSpace(6)}
        minHeight={scaleSpace(36)}
        paddingHorizontal={scaleSpace(props.paddingHorizontal ?? 10)}
        paddingVertical={scaleSpace(props.paddingVertical ?? 8)}
        borderRadius={radius}
        backgroundColor={bg}
        borderColor={props.borderColor ?? "transparent"}
        borderWidth={props.borderWidth ?? 0}
        onPress={props.onPress}
        pointerEvents={props.disableInteractionState ? "none" : undefined}
        hoverStyle={{ opacity: props.disableInteractionState ? 1 : 0.86 }}
        pressStyle={{ opacity: props.disableInteractionState ? 1 : 0.72 }}
        style={props.style}
      >
        {props.iconPosition !== "right" ? icon : null}
        {showText ? (
          <Text
            color={fg}
            fontSize={textFontSize}
            lineHeight={textLineHeight}
            {...resolveTextFontStyle({
              fontFamily: props.fontFamily,
              fontWeight: props.fontWeight ?? "600",
            })}
          >
            {props.text ?? "Skip"}
          </Text>
        ) : null}
        {props.iconPosition === "right" ? icon : null}
      </Button>
    </XStack>
  );
}
