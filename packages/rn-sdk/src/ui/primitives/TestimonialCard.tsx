import React from "react";
import { Image as ExpoImage } from "expo-image";
import { StyleSheet } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { createAssetCacheKey } from "../assets/cache";
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

export type TestimonialCardProps = {
  text: string;
  name?: string;
  role?: string;
  rating?: number;
  ratingIconVariant?: "filled" | "outlined";
  src?: string;
  bucket?: string;
  path?: string;
  avatarSize?: number;
  avatarRadius?: number;
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
  textColor?: string;
  nameColor?: string;
  roleColor?: string;
  ratingColor?: string;
  textFontSize?: number;
  nameFontSize?: number;
  roleFontSize?: number;
  fontFamily?: OnbornFontFamily;
  textFontWeight?: OnbornFontWeight;
  nameFontWeight?: OnbornFontWeight;
  roleFontWeight?: OnbornFontWeight;
  textLineHeight?: OnbornLineHeight;
  nameLineHeight?: OnbornLineHeight;
  roleLineHeight?: OnbornLineHeight;
};

function resolveShadowProps(shadow: TestimonialCardProps["shadow"]) {
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

export function TestimonialCard(props: TestimonialCardProps) {
  const { scaleFont, scaleImage, scaleRadius, scaleSpace } =
    useResponsiveScale();
  const radius = scaleRadius(props.radius ?? 18);
  const padding = scaleSpace(props.padding ?? 16);
  const gap = scaleSpace(props.gap ?? 12);
  const avatarSize = scaleImage(props.avatarSize ?? 44);
  const textFontSize = scaleFont(props.textFontSize ?? 16);
  const nameFontSize = scaleFont(props.nameFontSize ?? 14);
  const roleFontSize = scaleFont(props.roleFontSize ?? 12);
  const ratingIconSize = scaleSpace(20);
  const minHeight =
    typeof props.height === "number" && props.height > 0
      ? scaleSpace(props.height)
      : undefined;
  const rating = clampRating(props.rating);

  return (
    <YStack
      width="100%"
      minHeight={minHeight}
      position="relative"
      overflow="hidden"
      backgroundColor={resolveSolidBg(props.bg) ?? "#171B22"}
      borderRadius={radius}
      padding={padding}
      gap={gap}
      alignItems={props.alignItems ?? "stretch"}
      justifyContent={props.justifyContent ?? "center"}
      {...resolveShadowProps(props.shadow)}
    >
      <ComponentGradientBg bg={props.bg} radius={radius} />
      {rating > 0 ? (
        <RatingStars
          count={rating}
          color={props.ratingColor ?? "#FACC15"}
          variant={props.ratingIconVariant}
          size={ratingIconSize}
        />
      ) : null}
      <Text
        color={props.textColor ?? "#F3F5F8"}
        fontSize={textFontSize}
        lineHeight={resolveTextLineHeight(textFontSize, props.textLineHeight)}
        style={styles.content}
        {...resolveTextFontStyle({
          fontFamily: props.fontFamily,
          fontWeight: props.textFontWeight ?? "500",
        })}
      >
        {props.text}
      </Text>
      <XStack alignItems="center" gap={gap} style={styles.content}>
        {props.src ? (
          <ExpoImage
            source={{
              uri: props.src,
              cacheKey: createAssetCacheKey({
                bucket: props.bucket,
                path: props.path,
                src: props.src,
                prefix: "testimonial-avatar",
              }),
            }}
            cachePolicy="memory-disk"
            contentFit="cover"
            transition={160}
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius:
                typeof props.avatarRadius === "number"
                  ? scaleRadius(props.avatarRadius)
                  : avatarSize / 2,
            }}
          />
        ) : null}
        <YStack flex={1} minWidth={0}>
          {props.name ? (
            <Text
              color={props.nameColor ?? "#F3F5F8"}
              fontSize={nameFontSize}
              lineHeight={resolveTextLineHeight(
                nameFontSize,
                props.nameLineHeight,
              )}
              {...resolveTextFontStyle({
                fontFamily: props.fontFamily,
                fontWeight: props.nameFontWeight ?? "700",
              })}
            >
              {props.name}
            </Text>
          ) : null}
          {props.role ? (
            <Text
              color={props.roleColor ?? "#9CA5B3"}
              fontSize={roleFontSize}
              lineHeight={resolveTextLineHeight(
                roleFontSize,
                props.roleLineHeight,
              )}
              {...resolveTextFontStyle({
                fontFamily: props.fontFamily,
                fontWeight: props.roleFontWeight ?? "400",
              })}
            >
              {props.role}
            </Text>
          ) : null}
        </YStack>
      </XStack>
    </YStack>
  );
}

function RatingStars({
  count,
  color,
  variant = "filled",
  size,
}: {
  count: number;
  color: string;
  variant?: "filled" | "outlined";
  size: number;
}) {
  const StarIcon = PHOSPHOR_ICONS.star;
  const weight = variant === "outlined" ? "regular" : "fill";
  return (
    <XStack gap={4} alignItems="center" style={styles.content}>
      {Array.from({ length: count }, (_, index) => (
        <StarIcon key={index} color={color} size={size} weight={weight} />
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

const styles = StyleSheet.create({
  content: {
    position: "relative",
    zIndex: 1,
  },
});
