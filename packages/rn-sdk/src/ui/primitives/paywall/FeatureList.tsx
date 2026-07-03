import React from "react";
import { Check, type IconWeight } from "phosphor-react-native";
import { Text, XStack, YStack } from "tamagui";
import { resolveTextLineHeight } from "../../typography";
import {
  ComponentGradientBg,
  resolveSolidBg,
  type ComponentBg,
} from "../background";
import { useResponsiveScale } from "../../responsive";
import { PHOSPHOR_ICONS } from "../phosphorIcons";
import type { PaywallPrimitiveComponentProps } from "./types";

export function FeatureList({ ctx, props }: PaywallPrimitiveComponentProps) {
  const { flowTheme } = ctx;
  const { scaleFont, scaleImage, scaleRadius, scaleSpace } =
    useResponsiveScale();
  const list = props as {
    items?: { text: string; icon?: string }[];
    iconColor?: string;
    textColor?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    lineHeight?: "normal" | "tight" | "relaxed";
    gap?: number;
    iconSize?: number;
    iconWeight?: IconWeight;
    cardBg?: ComponentBg;
    cardRadius?: number;
    cardHeight?: number;
    cardPadding?: number;
  };
  const items = Array.isArray(list.items) ? list.items : [];
  if (items.length === 0) {
    return null;
  }
  const iconColor = resolveFeatureColor(
    ctx.resolveColor(list.iconColor),
    flowTheme.colors.primary ?? "#5F6FFF",
  );
  const textColor = resolveFeatureColor(
    ctx.resolveColor(list.textColor),
    flowTheme.colors.primary ?? "#111827",
  );
  const iconSize = scaleImage(list.iconSize ?? 18);
  const fontSize = scaleFont(list.fontSize ?? 15);
  const cardRadius = scaleRadius(list.cardRadius ?? 0);
  const cardPadding = scaleSpace(list.cardPadding ?? 0);
  const cardHeight =
    typeof list.cardHeight === "number" && list.cardHeight > 0
      ? scaleSpace(list.cardHeight)
      : undefined;
  const { solidColor: cardSolidBg, gradientBg: cardGradientBg } =
    resolveFeatureCardBackground(
      ctx,
      list.cardBg,
      flowTheme.colors.neutral ?? "transparent",
    );
  return (
    <YStack width="100%" gap={scaleSpace(list.gap ?? 10)}>
      {items.map((item, index) => {
        const IconComponent =
          item.icon && item.icon !== "none"
            ? (PHOSPHOR_ICONS[item.icon as keyof typeof PHOSPHOR_ICONS] ??
              Check)
            : undefined;
        return (
          <XStack
            key={`${item.text}-${index}`}
            width="100%"
            minHeight={cardHeight}
            gap={scaleSpace(10)}
            alignItems="center"
            position="relative"
            overflow="hidden"
            backgroundColor={cardSolidBg}
            borderRadius={cardRadius}
            padding={cardPadding}
          >
            <ComponentGradientBg bg={cardGradientBg} radius={cardRadius} />
            {IconComponent ? (
              <XStack
                width={iconSize}
                height={iconSize}
                flexShrink={0}
                alignItems="center"
                justifyContent="center"
                zIndex={1}
              >
                <IconComponent
                  size={iconSize}
                  color={iconColor}
                  weight={list.iconWeight ?? "bold"}
                />
              </XStack>
            ) : null}
            <Text
              flex={1}
              minWidth={0}
              zIndex={1}
              color={textColor}
              fontSize={fontSize}
              lineHeight={resolveTextLineHeight(fontSize, list.lineHeight)}
              fontFamily={
                list.fontFamily ?? flowTheme.fonts.body ?? ctx.layoutFontFamily
              }
              fontWeight={list.fontWeight ?? "500"}
            >
              {item.text}
            </Text>
          </XStack>
        );
      })}
    </YStack>
  );
}

function resolveFeatureCardBackground(
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

function resolveFeatureColor(
  value: string | undefined,
  fallback: string,
): string {
  if (!value || /^\{theme\.colors\.[a-zA-Z]+\}$/.test(value)) {
    return fallback;
  }
  return value;
}
