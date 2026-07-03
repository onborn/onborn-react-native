import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  type LayoutChangeEvent,
} from "react-native";
import { Text, XStack, YStack } from "tamagui";
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
import {
  ComponentGradientBg,
  resolveSolidBg,
  type ComponentBg,
} from "./background";
import { PHOSPHOR_ICONS } from "./phosphorIcons";

type FeatureItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: PhosphorIconName;
};

export type FeaturesProps = {
  layout?: "list" | "grid";
  items: FeatureItem[];
  bg?: ComponentBg;
  radius?: number;
  padding?: number;
  height?: number;
  gap?: number;
  shadow?: "none" | "sm" | "md" | "lg";
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  justifyContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around";
  iconColor?: string;
  iconBg?: string;
  iconSize?: number;
  iconRadius?: number;
  iconPadding?: number;
  iconWeight?: PhosphorIconWeight;
  titleColor?: string;
  subtitleColor?: string;
  titleFontSize?: number;
  subtitleFontSize?: number;
  fontFamily?: OnbornFontFamily;
  titleFontWeight?: OnbornFontWeight;
  subtitleFontWeight?: OnbornFontWeight;
  titleLineHeight?: OnbornLineHeight;
  subtitleLineHeight?: OnbornLineHeight;
  disableInteractionState?: boolean;
};

function resolveShadowProps(shadow: FeaturesProps["shadow"]) {
  switch (shadow) {
    case "sm":
      return {
        shadowColor: "#000000",
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      };
    case "md":
      return {
        shadowColor: "#000000",
        shadowOpacity: 0.16,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
      };
    case "lg":
      return {
        shadowColor: "#000000",
        shadowOpacity: 0.22,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 14 },
        elevation: 8,
      };
    case "none":
    default:
      return {};
  }
}

export function Features(props: FeaturesProps) {
  const { metrics, scaleFont, scaleImage, scaleRadius, scaleSpace } =
    useResponsiveScale();
  const estimatedContentWidth = Math.max(0, metrics.width - scaleSpace(48));
  const [containerWidth, setContainerWidth] = useState(estimatedContentWidth);
  const measuredWidthRef = useRef(false);
  const radius = scaleRadius(props.radius ?? 18);
  const padding = scaleSpace(props.padding ?? 14);
  const gap = scaleSpace(props.gap ?? 10);
  const iconSize = scaleImage(props.iconSize ?? 24);
  const iconRadius = scaleRadius(props.iconRadius ?? 999);
  const iconPadding = scaleSpace(props.iconPadding ?? 0);
  const titleFontSize = scaleFont(props.titleFontSize ?? 16);
  const subtitleFontSize = scaleFont(props.subtitleFontSize ?? 13);
  const minHeight =
    typeof props.height === "number" && props.height > 0
      ? scaleSpace(props.height)
      : undefined;
  const shadowInset = props.shadow && props.shadow !== "none" ? scaleSpace(4) : 0;
  const isGrid = props.layout === "grid";
  const gridWidth = Math.max(
    0,
    Math.min(containerWidth, estimatedContentWidth),
  );
  const gridCardSize = Math.max(0, Math.floor((gridWidth - gap) / 2));
  const gridCardHeight = minHeight ?? gridCardSize;

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    if (width <= 0 || metrics.fixed) {
      return;
    }
    if (Platform.OS === "web") {
      if (measuredWidthRef.current) {
        return;
      }
      measuredWidthRef.current = true;
      setContainerWidth(Math.min(width, estimatedContentWidth));
      return;
    }
    setContainerWidth(width);
  };

  useEffect(() => {
    measuredWidthRef.current = false;
    setContainerWidth(estimatedContentWidth);
  }, [estimatedContentWidth, metrics.height, metrics.width]);

  if (props.items.length === 0) {
    return null;
  }

  if (isGrid) {
    const rows: FeatureItem[][] = [];
    for (let index = 0; index < props.items.length; index += 2) {
      rows.push(props.items.slice(index, index + 2));
    }

    return (
      <YStack
        width="100%"
        gap={gap}
        paddingHorizontal={shadowInset}
        onLayout={handleLayout}
      >
        {rows.map((row, rowIndex) => (
          <XStack key={`row-${rowIndex}`} width="100%" gap={gap}>
            {row.map((item) => (
              <Pressable
                key={item.id}
                pointerEvents={props.disableInteractionState ? "none" : undefined}
                style={{ flex: 1, height: gridCardHeight, marginBottom: shadowInset }}
              >
                <FeatureCard
                  item={item}
                  props={props}
                  radius={radius}
                  padding={padding}
                  gap={gap}
                  iconSize={iconSize}
                  iconRadius={iconRadius}
                  iconPadding={iconPadding}
                  titleFontSize={titleFontSize}
                  subtitleFontSize={subtitleFontSize}
                  centered
                />
              </Pressable>
            ))}
            {row.length === 1 ? <XStack flex={1} /> : null}
          </XStack>
        ))}
      </YStack>
    );
  }

  return (
    <YStack
      width="100%"
      gap={gap}
      paddingHorizontal={shadowInset}
      onLayout={handleLayout}
    >
      {props.items.map((item) => (
        <Pressable
          key={item.id}
          pointerEvents={props.disableInteractionState ? "none" : undefined}
          style={{ width: "100%", marginBottom: shadowInset }}
        >
          <FeatureCard
            item={item}
            props={props}
            radius={radius}
            padding={padding}
            gap={gap}
            minHeight={minHeight}
            iconSize={iconSize}
            iconRadius={iconRadius}
            iconPadding={iconPadding}
            titleFontSize={titleFontSize}
            subtitleFontSize={subtitleFontSize}
          />
        </Pressable>
      ))}
    </YStack>
  );
}

function FeatureCard({
  item,
  props,
  radius,
  padding,
  gap,
  minHeight,
  iconSize,
  iconRadius,
  iconPadding,
  titleFontSize,
  subtitleFontSize,
  centered = false,
}: {
  item: FeatureItem;
  props: FeaturesProps;
  radius: number;
  padding: number;
  gap: number;
  minHeight?: number;
  iconSize: number;
  iconRadius: number;
  iconPadding: number;
  titleFontSize: number;
  subtitleFontSize: number;
  centered?: boolean;
}) {
  const IconComponent = item.icon ? PHOSPHOR_ICONS[item.icon] : null;
  const ContentStack = centered ? YStack : XStack;

  return (
    <YStack
      width="100%"
      height={centered ? "100%" : undefined}
      minHeight={minHeight}
      backgroundColor={resolveSolidBg(props.bg) ?? "#171B22"}
      borderRadius={radius}
      {...resolveShadowProps(props.shadow)}
    >
      <ContentStack
        width="100%"
        height={centered ? "100%" : undefined}
        minHeight={minHeight}
        overflow="hidden"
        alignItems={centered ? "center" : "center"}
        justifyContent={props.justifyContent ?? "center"}
        gap={gap}
        backgroundColor={resolveSolidBg(props.bg) ?? "#171B22"}
        borderRadius={radius}
        padding={padding}
      >
        <ComponentGradientBg bg={props.bg} radius={radius} />
        {IconComponent ? (
          <XStack
            flexShrink={0}
            alignItems="center"
            justifyContent="center"
            backgroundColor={props.iconBg ?? "transparent"}
            borderRadius={iconRadius}
            padding={iconPadding}
            style={styles.content}
          >
            <IconComponent
              color={props.iconColor ?? props.titleColor ?? "#F3F5F8"}
              size={iconSize}
              weight={props.iconWeight ?? "duotone"}
            />
          </XStack>
        ) : null}
        <YStack
          flex={centered ? undefined : 1}
          minWidth={0}
          alignItems={centered ? "center" : "flex-start"}
          gap={Math.max(2, Math.floor(gap / 2))}
          style={styles.content}
        >
          <Text
            color={props.titleColor ?? "#F3F5F8"}
            fontSize={titleFontSize}
            lineHeight={resolveTextLineHeight(
              titleFontSize,
              props.titleLineHeight,
            )}
            textAlign={centered ? "center" : "left"}
            {...resolveTextFontStyle({
              fontFamily: props.fontFamily,
              fontWeight: props.titleFontWeight ?? "700",
            })}
          >
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text
              color={props.subtitleColor ?? "#9CA5B3"}
              fontSize={subtitleFontSize}
              lineHeight={resolveTextLineHeight(
                subtitleFontSize,
                props.subtitleLineHeight,
              )}
              textAlign={centered ? "center" : "left"}
              {...resolveTextFontStyle({
                fontFamily: props.fontFamily,
                fontWeight: props.subtitleFontWeight ?? "400",
              })}
            >
              {item.subtitle}
            </Text>
          ) : null}
        </YStack>
      </ContentStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  content: {
    position: "relative",
    zIndex: 1,
  },
});
