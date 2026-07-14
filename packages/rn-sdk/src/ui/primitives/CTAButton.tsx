import React from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { Button, Text, XStack } from "tamagui";
import type {
  CTAButtonIconPosition,
  CTAButtonAction,
  PhosphorIconName,
  PhosphorIconWeight,
} from "@onborn/sdk-contracts";
import { Star, type IconWeight } from "phosphor-react-native";
import {
  resolveTextFontStyle,
  type OnbornFontFamily,
  type OnbornFontWeight,
} from "../typography/fonts";
import { useResponsiveScale } from "../responsive";
import { PHOSPHOR_ICONS } from "./phosphorIcons";

export function CTAButton(props: {
  text: string;
  action?: CTAButtonAction;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "inverted" | "outline" | "custom";
  fullWidth?: boolean;
  bg?: string;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  fontFamily?: OnbornFontFamily;
  fontWeight?: OnbornFontWeight;
  fontSize?: number;
  letterSpacing?: number;
  iconName?: PhosphorIconName;
  iconPosition?: CTAButtonIconPosition;
  iconColor?: string;
  iconSize?: number;
  iconWeight?: PhosphorIconWeight;
  disableInteractionState?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { scaleFont, scaleImage, scaleRadius, scaleSpace } =
    useResponsiveScale();
  const isSecondary = props.variant === "secondary";
  const isOutline = props.variant === "outline";
  const bg = props.bg ?? (isSecondary ? "#171B22" : "#5F6FFF");
  const fg = props.color ?? (isSecondary ? "#F3F5F8" : "#FFFFFF");
  const borderWidth = props.borderWidth ?? (isSecondary || isOutline ? 1 : 0);
  const borderColor = props.borderColor ?? (isOutline ? fg : "#2B3340");
  const fontSize = scaleFont(props.fontSize ?? 16);
  const radius = scaleRadius(props.borderRadius ?? 12);
  const fullWidth = props.fullWidth !== false;
  const IconComponent = props.iconName
    ? (PHOSPHOR_ICONS[props.iconName] ?? Star)
    : null;
  const icon = IconComponent ? (
    <IconComponent
      color={props.iconColor ?? fg}
      size={scaleImage(props.iconSize ?? 20)}
      weight={(props.iconWeight ?? "bold") as IconWeight}
    />
  ) : null;
  const content = (
    <XStack alignItems="center" justifyContent="center" gap={scaleSpace(8)}>
      {props.iconPosition !== "right" ? icon : null}
      <Text
        color={fg}
        fontSize={fontSize}
        letterSpacing={props.letterSpacing}
        {...resolveTextFontStyle({
          fontFamily: props.fontFamily,
          fontWeight: props.fontWeight ?? "600",
        })}
      >
        {props.text}
      </Text>
      {props.iconPosition === "right" ? icon : null}
    </XStack>
  );

  return (
    <XStack width={fullWidth ? "100%" : undefined}>
      <Button
        flex={fullWidth ? 1 : undefined}
        borderRadius={radius}
        overflow="hidden"
        onPress={props.onPress}
        disabled={props.disabled}
        pointerEvents={props.disableInteractionState ? "none" : undefined}
        hoverStyle={
          props.disableInteractionState
            ? {
                opacity: 1,
                backgroundColor: props.disabled ? `${bg}66` : bg,
                borderColor,
              }
            : {
                opacity: props.disabled ? 0.8 : 0.92,
              }
        }
        pressStyle={
          props.disableInteractionState
            ? {
                opacity: 1,
                backgroundColor: props.disabled ? `${bg}66` : bg,
                borderColor,
              }
            : {
                opacity: props.disabled ? 0.8 : 0.86,
              }
        }
        style={
          [
          {
            minHeight: scaleSpace(48),
            borderRadius: radius,
            backgroundColor: props.disabled ? `${bg}66` : bg,
            borderWidth,
            borderColor,
            opacity: props.disabled ? 0.8 : 1,
          },
          props.style,
          ] as never
        }
      >
        {content}
      </Button>
    </XStack>
  );
}
