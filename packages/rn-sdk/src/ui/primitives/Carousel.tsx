import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  type LayoutChangeEvent,
  type ListRenderItem,
  type ViewStyle,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { Text, XStack, YStack } from "tamagui";
import { useResponsiveScale } from "../responsive";
import { createAssetCacheKey } from "../assets/cache";
import {
  resolveTextFontStyle,
  resolveTextLineHeight,
  type OnbornFontFamily,
  type OnbornFontWeight,
  type OnbornLineHeight,
} from "../typography/fonts";
import { useCarouselRuntime } from "./CarouselRuntime";
import {
  ComponentGradientBg,
  resolveSolidBg,
  type ComponentBg,
} from "./background";
import { PHOSPHOR_ICONS } from "./phosphorIcons";

export type CarouselItem = {
  image?: string;
  bucket?: string;
  path?: string;
  title?: string;
  subtitle?: string;
  text?: string;
  name?: string;
  role?: string;
  rating?: number;
};

export function Carousel(props: {
  items: CarouselItem[];
  variant?: "media" | "testimonial";
  itemHeight?: number;
  borderRadius?: number;
  widthMode?: "card" | "full";
  cardBg?: ComponentBg;
  titleColor?: string;
  subtitleColor?: string;
  textColor?: string;
  ratingColor?: string;
  titleFontSize?: number;
  subtitleFontSize?: number;
  textFontSize?: number;
  avatarSize?: number;
  titleFontFamily?: OnbornFontFamily;
  subtitleFontFamily?: OnbornFontFamily;
  textFontFamily?: OnbornFontFamily;
  titleFontWeight?: OnbornFontWeight;
  subtitleFontWeight?: OnbornFontWeight;
  textFontWeight?: OnbornFontWeight;
  titleLineHeight?: OnbornLineHeight;
  subtitleLineHeight?: OnbornLineHeight;
  textLineHeight?: OnbornLineHeight;
}) {
  const runtime = useCarouselRuntime();
  const { metrics, scaleFont, scaleImage, scaleRadius, scaleSpace } =
    useResponsiveScale();
  const [viewportWidth, setViewportWidth] = useState(metrics.width);
  const measuredWidthRef = useRef(false);
  const isFullWidth = props.widthMode === "full";
  const gap = isFullWidth ? 0 : scaleSpace(12);
  const cardWidth = isFullWidth
    ? viewportWidth
    : Math.max(scaleImage(220), Math.min(viewportWidth - gap, scaleImage(300)));
  const cardHeight = scaleImage(props.itemHeight ?? 220);
  const radius = scaleRadius(props.borderRadius ?? 18);
  const cardClipStyle = useMemo<ViewStyle>(
    () => ({
      borderRadius: radius,
      overflow: "hidden",
    }),
    [radius],
  );
  const titleFontSize = scaleFont(props.titleFontSize ?? 18);
  const subtitleFontSize = scaleFont(props.subtitleFontSize ?? 14);
  const textFontSize = scaleFont(props.textFontSize ?? 16);
  const avatarSize = scaleImage(props.avatarSize ?? 44);
  const ratingIconSize = scaleSpace(20);
  const snapInterval = cardWidth + gap;
  const sidePadding = isFullWidth
    ? 0
    : Math.max(0, (viewportWidth - cardWidth) / 2);

  useEffect(() => {
    runtime?.setCount(props.items.length);
    if (runtime) {
      runtime.activeIndex.value = 0;
    }
  }, [props.items.length, runtime]);

  useEffect(() => {
    measuredWidthRef.current = false;
    setViewportWidth(metrics.width);
  }, [metrics.height, metrics.width]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (!runtime || snapInterval <= 0) {
        return;
      }
      runtime.activeIndex.value = event.contentOffset.x / snapInterval;
    },
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    if (width <= 0) {
      return;
    }
    if (Platform.OS === "web") {
      if (measuredWidthRef.current) {
        return;
      }
      measuredWidthRef.current = true;
      setViewportWidth(Math.min(width, metrics.width));
      return;
    }
    setViewportWidth(width);
  };

  const renderItem: ListRenderItem<CarouselItem> = ({ item }) => (
    <YStack
      width={cardWidth}
      minHeight={cardHeight}
      position="relative"
      backgroundColor={resolveSolidBg(props.cardBg) ?? "#171B22"}
      borderRadius={radius}
      padding={scaleSpace(16)}
      borderWidth={1}
      borderColor="#2B3340"
      overflow="hidden"
      style={cardClipStyle}
    >
      <ComponentGradientBg bg={props.cardBg} radius={radius} />
      {props.variant === "testimonial" ? (
        <YStack position="relative" zIndex={1} gap={scaleSpace(12)} flex={1}>
          {clampRating(item.rating) > 0 ? (
            <RatingStars
              count={clampRating(item.rating)}
              color={props.ratingColor ?? "#FACC15"}
              size={ratingIconSize}
            />
          ) : null}
          <Text
            fontSize={textFontSize}
            lineHeight={resolveTextLineHeight(
              textFontSize,
              props.textLineHeight ?? "normal",
            )}
            color={props.textColor ?? "#F3F5F8"}
            {...resolveTextFontStyle({
              fontFamily: props.textFontFamily ?? props.titleFontFamily,
              fontWeight: props.textFontWeight ?? "500",
            })}
          >
            {item.text ?? item.subtitle ?? ""}
          </Text>
          <XStack alignItems="center" gap={scaleSpace(12)} marginTop="auto">
            {item.image ? (
              <ExpoImage
                source={{
                  uri: item.image,
                  cacheKey: createAssetCacheKey({
                    bucket: item.bucket,
                    path: item.path,
                    src: item.image,
                    prefix: "carousel-testimonial-avatar",
                  }),
                }}
                cachePolicy="memory-disk"
                contentFit="cover"
                transition={160}
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                }}
              />
            ) : null}
            <YStack flex={1} minWidth={0}>
              {item.name || item.title ? (
                <Text
                  fontSize={titleFontSize}
                  lineHeight={resolveTextLineHeight(
                    titleFontSize,
                    props.titleLineHeight ?? "normal",
                  )}
                  color={props.titleColor ?? "#F3F5F8"}
                  {...resolveTextFontStyle({
                    fontFamily: props.titleFontFamily,
                    fontWeight: props.titleFontWeight ?? "700",
                  })}
                >
                  {item.name ?? item.title}
                </Text>
              ) : null}
              {item.role ? (
                <Text
                  fontSize={subtitleFontSize}
                  lineHeight={resolveTextLineHeight(
                    subtitleFontSize,
                    props.subtitleLineHeight ?? "normal",
                  )}
                  color={props.subtitleColor ?? "#9CA5B3"}
                  {...resolveTextFontStyle({
                    fontFamily: props.subtitleFontFamily,
                    fontWeight: props.subtitleFontWeight ?? "400",
                  })}
                >
                  {item.role}
                </Text>
              ) : null}
            </YStack>
          </XStack>
        </YStack>
      ) : (
      <YStack position="relative" zIndex={1}>
        {item.image ? (
          <ExpoImage
            source={{
              uri: item.image,
              cacheKey: createAssetCacheKey({
                bucket: item.bucket,
                path: item.path,
                src: item.image,
                prefix: "carousel",
              }),
            }}
            cachePolicy="memory-disk"
            contentFit="cover"
            transition={160}
            style={{
              width: "100%",
              height: Math.max(scaleImage(96), cardHeight * 0.56),
              borderRadius: scaleRadius(12),
            }}
          />
        ) : null}
        {item.title ? (
          <Text
            fontSize={titleFontSize}
            lineHeight={resolveTextLineHeight(
              titleFontSize,
              props.titleLineHeight ?? "normal",
            )}
            marginTop={scaleSpace(12)}
            color={props.titleColor ?? "#F3F5F8"}
            {...resolveTextFontStyle({
              fontFamily: props.titleFontFamily,
              fontWeight: props.titleFontWeight ?? "700",
            })}
          >
            {item.title}
          </Text>
        ) : null}
        {item.subtitle ? (
          <Text
            fontSize={subtitleFontSize}
            lineHeight={resolveTextLineHeight(
              subtitleFontSize,
              props.subtitleLineHeight ?? "normal",
            )}
            color={props.subtitleColor ?? "#9CA5B3"}
            marginTop={scaleSpace(4)}
            {...resolveTextFontStyle({
              fontFamily: props.subtitleFontFamily,
              fontWeight: props.subtitleFontWeight ?? "400",
            })}
          >
            {item.subtitle}
          </Text>
        ) : null}
      </YStack>
      )}
    </YStack>
  );

  if (!props.items.length) {
    return null;
  }

  return (
    <YStack width="100%" overflow="hidden">
      <Animated.FlatList
        data={props.items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        onLayout={handleLayout}
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        disableIntervalMomentum
        bounces={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          gap,
          paddingHorizontal: sidePadding,
        }}
        style={[
          {
            width: "100%",
          },
          carouselWebStyle,
        ]}
      />
    </YStack>
  );
}

export function CarouselPagination(props: {
  count: number;
  activeColor?: string;
  inactiveColor?: string;
  dotSize?: number;
  gap?: number;
}) {
  const runtime = useCarouselRuntime();
  const { scaleRadius, scaleSpace } = useResponsiveScale();
  const count = Math.max(1, runtime?.count || props.count);
  const dotSize = Math.max(4, scaleSpace(props.dotSize ?? 8));
  const gap = scaleSpace(props.gap ?? 8);
  const activeColor = normalizeCarouselPaginationColor(
    props.activeColor,
    "#F3F5F8",
  );
  const inactiveColor = normalizeCarouselPaginationColor(
    props.inactiveColor,
    "#4B5563",
  );

  return (
    <XStack alignItems="center" justifyContent="center" gap={gap} width="100%">
      {Array.from({ length: count }, (_, index) => (
        <PaginationDot
          key={index}
          index={index}
          activeIndex={runtime?.activeIndex}
          dotSize={dotSize}
          radius={scaleRadius(999)}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
        />
      ))}
    </XStack>
  );
}

function normalizeCarouselPaginationColor(
  value: string | undefined,
  fallback: string,
): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("{")) {
    return fallback;
  }
  return trimmed;
}

function PaginationDot({
  index,
  activeIndex,
  dotSize,
  radius,
  activeColor,
  inactiveColor,
}: {
  index: number;
  activeIndex?: SharedValue<number>;
  dotSize: number;
  radius: number;
  activeColor: string;
  inactiveColor: string;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = activeIndex
      ? Math.min(1, Math.abs(activeIndex.value - index))
      : index === 0
        ? 0
        : 1;
    return {
      width: interpolate(distance, [0, 1], [dotSize * 2.4, dotSize]),
      opacity: interpolate(distance, [0, 1], [1, 0.42]),
      backgroundColor: interpolateColor(
        distance,
        [0, 1],
        [activeColor, inactiveColor],
      ),
    };
  }, [activeColor, dotSize, inactiveColor, index]);

  return (
    <Animated.View
      style={[
        {
          height: dotSize,
          borderRadius: radius,
          backgroundColor: inactiveColor,
        },
        animatedStyle,
      ]}
    />
  );
}

function keyExtractor(item: CarouselItem, index: number) {
  return `${item.title ?? item.name ?? ""}-${item.image ?? ""}-${index}`;
}

function RatingStars({
  count,
  color,
  size,
}: {
  count: number;
  color: string;
  size: number;
}) {
  const StarIcon = PHOSPHOR_ICONS.star;
  return (
    <XStack gap={4} alignItems="center">
      {Array.from({ length: count }, (_, index) => (
        <StarIcon
          key={index}
          color={color}
          size={size}
          weight="fill"
        />
      ))}
    </XStack>
  );
}

function clampRating(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(5, Math.round(value)));
}

const carouselWebStyle = {
  cursor: "grab",
  touchAction: "pan-x",
} as unknown as ViewStyle;
