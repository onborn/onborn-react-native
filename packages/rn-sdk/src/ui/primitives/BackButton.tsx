import React from "react";
import { Button, Text, XStack } from "tamagui";
import type { PhosphorIconName } from "@onborn/sdk-contracts";
import { CaretLeft, type IconWeight } from "phosphor-react-native";
import {
  resolveTextFontStyle,
  resolveTextLineHeight,
  type OnbornFontFamily,
  type OnbornFontWeight,
  type OnbornLineHeight,
} from "../typography/fonts";
import { useResponsiveScale } from "../responsive";
import { PHOSPHOR_ICONS } from "./phosphorIcons";

export function BackButton(props: {
  variant?: "icon" | "icon_text";
  text?: string;
  icon?: Extract<PhosphorIconName, "caret-left" | "arrow-left">;
  bg?: string;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  iconSize?: number;
  fontSize?: number;
  fontFamily?: OnbornFontFamily;
  fontWeight?: OnbornFontWeight;
  lineHeight?: OnbornLineHeight;
  onPress?: () => void;
  disableInteractionState?: boolean;
}) {
  const { scaleFont, scaleSpace } = useResponsiveScale();
  const color = props.color ?? "#F3F5F8";
  const IconComponent = props.icon
    ? (PHOSPHOR_ICONS[props.icon] ?? CaretLeft)
    : CaretLeft;
  const showText = props.variant === "icon_text";
  const legacySize = (props as { size?: "sm" | "md" | "lg" }).size;
  const legacyTextFontSize =
    legacySize === "sm" ? 13 : legacySize === "lg" ? 17 : 15;
  const legacyIconFontSize =
    legacySize === "sm" ? 24 : legacySize === "lg" ? 30 : 27;
  const textFontSize = scaleFont(props.fontSize ?? legacyTextFontSize);
  const textLineHeight =
    resolveTextLineHeight(textFontSize, props.lineHeight) ??
    Math.round(textFontSize * 1.25);
  const iconFontSize = scaleFont(props.iconSize ?? legacyIconFontSize);
  const iconBoxSize = Math.max(textLineHeight, iconFontSize);

  return (
    <XStack alignItems="center" flexShrink={0}>
      <Button
        unstyled
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        gap={scaleSpace(6)}
        minHeight={scaleSpace(36)}
        backgroundColor={props.bg ?? "transparent"}
        borderColor={props.borderColor ?? "transparent"}
        borderWidth={props.borderWidth ?? 0}
        borderRadius={scaleSpace(props.borderRadius ?? 999)}
        paddingHorizontal={scaleSpace(props.paddingHorizontal ?? 0)}
        paddingVertical={scaleSpace(props.paddingVertical ?? 0)}
        onPress={props.onPress}
        pointerEvents={props.disableInteractionState ? "none" : undefined}
        hoverStyle={{ opacity: props.disableInteractionState ? 1 : 0.86 }}
        pressStyle={{ opacity: props.disableInteractionState ? 1 : 0.72 }}
      >
        <XStack
          width={iconFontSize}
          height={iconBoxSize}
          alignItems="center"
          justifyContent="center"
        >
          <IconComponent
            color={color}
            size={iconFontSize}
            weight={"bold" as IconWeight}
          />
        </XStack>
        {showText ? (
          <Text
            color={color}
            fontSize={textFontSize}
            lineHeight={textLineHeight}
            {...resolveTextFontStyle({
              fontFamily: props.fontFamily,
              fontWeight: props.fontWeight ?? "600",
            })}
          >
            {props.text ?? "Back"}
          </Text>
        ) : null}
      </Button>
    </XStack>
  );
}
