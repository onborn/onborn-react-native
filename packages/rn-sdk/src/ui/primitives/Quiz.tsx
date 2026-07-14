import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
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
import { PHOSPHOR_ICONS } from "./phosphorIcons";
import {
  ComponentGradientBg,
  resolveSolidBg,
  type ComponentBg,
} from "./background";
import { SelectionIndicator } from "./paywall/SelectionIndicator";

type QuizOption = {
  id: string;
  label: string;
  subtitle?: string;
  icon?: PhosphorIconName;
  nextStepId?: string;
};

export type QuizProps = {
  mode: "single" | "multi";
  layout?: "list" | "grid" | "radio-list" | "checkmark-list";
  required?: boolean;
  options: QuizOption[];
  selectedIds?: string[];
  bg?: ComponentBg;
  radius?: number;
  padding?: number;
  height?: number;
  gap?: number;
  shadow?: "none" | "sm" | "md" | "lg";
  borderColor?: string;
  borderWidth?: number;
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  justifyContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around";
  selectionColor?: string;
  selectionBorderColor?: string;
  iconColor?: string;
  iconSize?: number;
  iconWeight?: PhosphorIconWeight;
  color?: string;
  fontSize?: number;
  fontFamily?: OnbornFontFamily;
  fontWeight?: OnbornFontWeight;
  lineHeight?: OnbornLineHeight;
  subtitleColor?: string;
  subtitleFontSize?: number;
  subtitleFontFamily?: OnbornFontFamily;
  subtitleFontWeight?: OnbornFontWeight;
  subtitleLineHeight?: OnbornLineHeight;
  disableInteractionState?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
};

function normalizeSelectedIds(
  mode: QuizProps["mode"],
  selectedIds: string[] | undefined,
): string[] {
  return mode === "single"
    ? (selectedIds?.slice(0, 1) ?? [])
    : (selectedIds ?? []);
}

function resolveShadowProps(shadow: QuizProps["shadow"]) {
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

function resolveCardBorderProps(props: QuizProps) {
  if (typeof props.borderWidth === "number" && props.borderWidth > 0) {
    return {
      borderWidth: props.borderWidth,
      borderColor: props.borderColor ?? "transparent",
    };
  }
  return {};
}

export function Quiz(props: QuizProps) {
  const { metrics, scaleFont, scaleRadius, scaleSpace } = useResponsiveScale();
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(normalizeSelectedIds(props.mode, props.selectedIds)),
  );
  const selectedIdsKey = normalizeSelectedIds(
    props.mode,
    props.selectedIds,
  ).join("\u0001");
  const estimatedContentWidth = Math.max(0, metrics.width - scaleSpace(48));
  const [containerWidth, setContainerWidth] = useState(estimatedContentWidth);
  const measuredWidthRef = useRef(false);
  const fontSize = scaleFont(props.fontSize ?? 16);
  const subtitleFontSize = scaleFont(props.subtitleFontSize ?? 13);
  const radius = scaleRadius(props.radius ?? 16);
  const padding = scaleSpace(props.padding ?? 14);
  const gap = scaleSpace(props.gap ?? 10);
  const iconSize = scaleSpace(props.iconSize ?? 22);
  const shadowInset = props.shadow && props.shadow !== "none" ? scaleSpace(4) : 0;
  const cardBorder = resolveCardBorderProps(props);
  const isGrid = props.layout === "grid";
  const isRadioList = props.layout === "radio-list";
  const isCheckmarkList = props.layout === "checkmark-list";
  const gridWidth = Math.max(
    0,
    Math.min(containerWidth, estimatedContentWidth),
  );
  const gridCardSize = Math.max(0, Math.floor((gridWidth - gap) / 2));
  const minHeight =
    typeof props.height === "number" && props.height > 0
      ? scaleSpace(props.height)
      : undefined;
  const gridCardHeight = minHeight ?? gridCardSize;

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    if (width <= 0) {
      return;
    }
    if (metrics.fixed) {
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

  useEffect(() => {
    setSelectedIds(new Set(normalizeSelectedIds(props.mode, props.selectedIds)));
  }, [props.mode, selectedIdsKey]);

  const toggleOption = (id: string) => {
    const next =
      props.mode === "single" ? new Set<string>([id]) : new Set(selectedIds);
    if (props.mode !== "single") {
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
    }
    const nextIds = [...next];
    setSelectedIds(next);
    props.onSelectionChange?.(nextIds);
  };

  if (isGrid) {
    const rows: QuizOption[][] = [];
    for (let index = 0; index < props.options.length; index += 2) {
      rows.push(props.options.slice(index, index + 2));
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
            {row.map((option) => {
              const selected = selectedIds.has(option.id);

              return (
                <Pressable
                  key={option.id}
                  onPress={() => toggleOption(option.id)}
                  pointerEvents={
                    props.disableInteractionState ? "none" : undefined
                  }
                  style={{
                    flex: 1,
                    height: gridCardHeight,
                    marginBottom: shadowInset,
                  }}
                >
                  <QuizOptionCard
                    option={option}
                    props={props}
                    selected={selected}
                    radius={radius}
                    padding={padding}
                    gap={gap}
                    iconSize={iconSize}
                    fontSize={fontSize}
                    subtitleFontSize={subtitleFontSize}
                    minHeight={gridCardHeight}
                    cardBorder={cardBorder}
                    centered
                  />
                </Pressable>
              );
            })}
            {row.length === 1 ? <XStack flex={1} /> : null}
          </XStack>
        ))}
      </YStack>
    );
  }

  return (
    <XStack
      width="100%"
      gap={gap}
      flexWrap="nowrap"
      flexDirection="column"
      paddingHorizontal={shadowInset}
      onLayout={handleLayout}
    >
      {props.options.map((option) => {
        const selected = selectedIds.has(option.id);

        return (
          <Pressable
            key={option.id}
            onPress={() => toggleOption(option.id)}
            pointerEvents={props.disableInteractionState ? "none" : undefined}
            style={{ width: "100%", marginBottom: shadowInset }}
          >
            <QuizOptionCard
              option={option}
              props={props}
              selected={selected}
              radius={radius}
              padding={padding}
              gap={gap}
              iconSize={iconSize}
              fontSize={fontSize}
              subtitleFontSize={subtitleFontSize}
              minHeight={minHeight}
              cardBorder={cardBorder}
              indicator={
                isRadioList
                  ? "radio"
                  : isCheckmarkList
                    ? "checkmark"
                    : undefined
              }
            />
          </Pressable>
        );
      })}
    </XStack>
  );
}

function QuizOptionCard({
  option,
  props,
  selected,
  radius,
  padding,
  gap,
  iconSize,
  fontSize,
  subtitleFontSize,
  minHeight,
  cardBorder,
  centered = false,
  indicator,
}: {
  option: QuizOption;
  props: QuizProps;
  selected: boolean;
  radius: number;
  padding: number;
  gap: number;
  iconSize: number;
  fontSize: number;
  subtitleFontSize: number;
  minHeight?: number;
  cardBorder: ReturnType<typeof resolveCardBorderProps>;
  centered?: boolean;
  indicator?: "radio" | "checkmark";
}) {
  const IconComponent =
    !indicator && option.icon ? PHOSPHOR_ICONS[option.icon] : null;
  const ContentStack = centered ? YStack : XStack;
  const cardBg = resolveSolidBg(props.bg) ?? "#171B22";

  return (
    <YStack
      width="100%"
      height={centered ? "100%" : undefined}
      minHeight={minHeight}
      backgroundColor={cardBg}
      borderRadius={radius}
      {...resolveShadowProps(props.shadow)}
    >
      <ContentStack
        width="100%"
        height={centered ? "100%" : undefined}
        minHeight={minHeight}
        overflow="hidden"
        alignItems={centered ? "center" : props.alignItems ?? "center"}
        justifyContent={props.justifyContent ?? "flex-start"}
        gap={gap}
        backgroundColor={cardBg}
        borderRadius={radius}
        padding={padding}
        {...cardBorder}
      >
        <ComponentGradientBg bg={props.bg} radius={radius} />
        {IconComponent ? (
          <IconComponent
            color={props.iconColor ?? props.color ?? "#F3F5F8"}
            size={iconSize}
            weight={props.iconWeight ?? "duotone"}
            style={styles.cardContent}
          />
        ) : null}
        <YStack
          flex={centered ? undefined : 1}
          minWidth={0}
          flexShrink={1}
          alignItems={centered ? "center" : "flex-start"}
          justifyContent="center"
          gap={Math.max(2, Math.floor(gap / 2))}
          style={styles.cardContent}
        >
          <Text
            minWidth={0}
            color={props.color ?? "#F3F5F8"}
            fontSize={fontSize}
            lineHeight={resolveTextLineHeight(fontSize, props.lineHeight)}
            textAlign={centered ? "center" : "left"}
            {...resolveTextFontStyle({
              fontFamily: props.fontFamily,
              fontWeight: props.fontWeight ?? "600",
            })}
          >
            {option.label}
          </Text>
          {option.subtitle ? (
            <Text
              color={props.subtitleColor ?? "#9CA5B3"}
              fontSize={subtitleFontSize}
              lineHeight={resolveTextLineHeight(
                subtitleFontSize,
                props.subtitleLineHeight,
              )}
              textAlign={centered ? "center" : "left"}
              {...resolveTextFontStyle({
                fontFamily: props.subtitleFontFamily,
                fontWeight: props.subtitleFontWeight ?? "400",
              })}
            >
              {option.subtitle}
            </Text>
          ) : null}
        </YStack>
        {indicator ? (
          <View style={[styles.cardContent, styles.selectionIndicator]}>
            <SelectionIndicator
              indicator={indicator}
              selected={selected}
              color={
                props.selectionBorderColor ?? props.selectionColor ?? "#5F6FFF"
              }
            />
          </View>
        ) : null}
        <QuizSelectionOverlay
          selected={selected}
          color={props.selectionColor}
          borderColor={props.selectionBorderColor}
          radius={radius}
        />
      </ContentStack>
    </YStack>
  );
}

function QuizSelectionOverlay({
  selected,
  color,
  borderColor,
  radius,
}: {
  selected: boolean;
  color?: string;
  borderColor?: string;
  radius: number;
}) {
  const fillColor = color ?? "#5F6FFF";
  const strokeColor = borderColor ?? fillColor;

  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, {
      duration: selected ? 180 : 140,
    });
  }, [progress, selected]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.985 + progress.value * 0.015 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.selectionOverlay,
        {
          borderColor: strokeColor,
          borderRadius: radius,
        },
        overlayStyle,
      ]}
    >
      <View
        style={[
          styles.selectionOverlayFill,
          {
            backgroundColor: fillColor,
            borderRadius: radius,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    position: "relative",
    zIndex: 1,
  },
  selectionIndicator: {
    zIndex: 3,
  },
  selectionOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 1,
    opacity: 0,
    zIndex: 2,
  },
  selectionOverlayFill: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.16,
  },
});
