import React from "react";
import { Button, Text, XStack } from "tamagui";
import { X } from "phosphor-react-native";
import { useResponsiveScale } from "../../responsive";
import {
  resolveTextFontStyle,
  type OnbornFontFamily,
  type OnbornFontWeight,
} from "../../typography/fonts";
import {
  ComponentGradientBg,
  resolveSolidBg,
  type ComponentBg,
} from "../background";
import type { PaywallPrimitiveComponentProps } from "./types";
import { isBuilderCanvasPreview } from "./utils";

type CloseButtonDisplay = "icon" | "text" | "icon_text";
type CloseButtonShowIn = "standalone" | "flow" | "both";

export function CloseButton({ ctx, props }: PaywallPrimitiveComponentProps) {
  const { flowTheme } = ctx;
  const { scaleFont, scaleImage, scaleRadius, scaleSpace } =
    useResponsiveScale();
  const close = props as {
    text?: string;
    display?: CloseButtonDisplay;
    showIn?: CloseButtonShowIn;
    bg?: ComponentBg;
    color?: string;
    iconColor?: string;
    fontSize?: number;
    fontFamily?: OnbornFontFamily;
    fontWeight?: OnbornFontWeight;
    size?: number;
    iconSize?: number;
    borderRadius?: number;
    paddingHorizontal?: number;
    gap?: number;
  };
  const display = close.display ?? "icon";
  const showIcon = display !== "text";
  const showText = display !== "icon";
  const showIn = normalizeCloseButtonShowIn(close.showIn);
  const presentationMode =
    ctx.options?.paywallContext?.presentationMode ?? "standalone";
  const size = scaleSpace(close.size ?? 36);
  const radius = scaleRadius(close.borderRadius ?? 999);
  const bg = resolveCloseButtonBg(
    ctx,
    close.bg,
    flowTheme.colors.primary ?? "#111827",
  );
  const color =
    ctx.resolveColor(close.color) ?? flowTheme.colors.secondary ?? "#64748B";
  const iconColor = ctx.resolveColor(close.iconColor) ?? color;
  const fontSize = scaleFont(close.fontSize ?? 14);
  const paddingHorizontal = showText
    ? scaleSpace(close.paddingHorizontal ?? 12)
    : 0;

  if (
    !isBuilderCanvasPreview(ctx.options) &&
    !shouldShowCloseButton(showIn, presentationMode)
  ) {
    return null;
  }

  return (
    <XStack flexShrink={0}>
      <Button
        unstyled
        position="relative"
        overflow="hidden"
        minWidth={showText ? undefined : size}
        minHeight={size}
        paddingHorizontal={paddingHorizontal}
        paddingVertical={0}
        borderRadius={radius}
        alignItems="center"
        justifyContent="center"
        backgroundColor={bg.solidColor}
        onPress={
          isBuilderCanvasPreview(ctx.options)
            ? undefined
            : ctx.options?.paywallContext?.onDismissPaywall
        }
        pointerEvents={
          ctx.options?.disableInteractionState ? "none" : undefined
        }
        hoverStyle={{ opacity: ctx.options?.disableInteractionState ? 1 : 0.9 }}
        pressStyle={{ opacity: ctx.options?.disableInteractionState ? 1 : 0.76 }}
      >
        <ComponentGradientBg bg={bg.gradientBg} radius={radius} />
        <XStack
          position="relative"
          zIndex={1}
          alignItems="center"
          justifyContent="center"
          gap={scaleSpace(close.gap ?? 6)}
        >
          {showIcon ? (
            <X
              color={iconColor}
              size={scaleImage(close.iconSize ?? 18)}
              weight="bold"
            />
          ) : null}
          {showText ? (
            <Text
              color={color}
              fontSize={fontSize}
              {...resolveTextFontStyle({
                fontFamily:
                  close.fontFamily ??
                  flowTheme.fonts.label ??
                  ctx.layoutFontFamily,
                fontWeight: close.fontWeight ?? "600",
              })}
            >
              {close.text ?? "Close"}
            </Text>
          ) : null}
        </XStack>
      </Button>
    </XStack>
  );
}

function normalizeCloseButtonShowIn(
  value: CloseButtonShowIn | undefined,
): CloseButtonShowIn {
  if (value === "standalone" || value === "flow" || value === "both") {
    return value;
  }
  return "both";
}

function shouldShowCloseButton(
  showIn: CloseButtonShowIn,
  presentationMode: "standalone" | "flow",
): boolean {
  return showIn === "both" || showIn === presentationMode;
}

function resolveCloseButtonBg(
  ctx: PaywallPrimitiveComponentProps["ctx"],
  bg: ComponentBg | undefined,
  fallback: string,
): { solidColor: string; gradientBg?: ComponentBg } {
  if (bg && typeof bg === "object") {
    return { solidColor: fallback, gradientBg: bg };
  }
  return {
    solidColor:
      (typeof bg === "string" ? ctx.resolveColor(resolveSolidBg(bg)) : undefined) ??
      fallback,
  };
}
