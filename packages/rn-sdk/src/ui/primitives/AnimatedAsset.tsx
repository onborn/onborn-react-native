import React, { useMemo } from "react";
import type { ImageStyle, StyleProp, ViewStyle } from "react-native";
import { StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { createAssetCacheKey } from "../assets/cache";
import { useResponsiveScale } from "../responsive";
import {
  ComponentGradientBg,
  resolveSolidBg,
  type ComponentBg,
} from "./background";

type OptionalLottieComponent = React.ComponentType<{
  source: { uri: string } | object;
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  resizeMode?: "cover" | "contain" | "center";
  style?: StyleProp<ViewStyle>;
}>;

let cachedLottieView: OptionalLottieComponent | null | undefined;
let registeredLottieView: OptionalLottieComponent | null = null;

export function setAnimatedAssetRenderer(
  renderer: OptionalLottieComponent | null,
) {
  registeredLottieView = renderer;
}

function getOptionalLottieView(): OptionalLottieComponent | null {
  if (registeredLottieView) {
    return registeredLottieView;
  }
  if (cachedLottieView !== undefined) {
    return cachedLottieView;
  }
  try {
    const globalRequire = (globalThis as { require?: (id: string) => unknown })
      .require;
    const moduleName = "lottie-react-native";
    const loaded = globalRequire?.(moduleName) as
      | { default?: OptionalLottieComponent }
      | OptionalLottieComponent
      | undefined;
    cachedLottieView =
      typeof loaded === "function" ? loaded : loaded?.default ?? null;
  } catch {
    cachedLottieView = null;
  }
  return cachedLottieView;
}

export function AnimatedAssetPrimitive(props: {
  format?: "lottie_json";
  src?: string;
  bucket?: string;
  path?: string;
  fallbackSrc?: string;
  fallbackBucket?: string;
  fallbackPath?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  borderRadius?: number;
  widthMode?: "card" | "full";
  resizeMode?: "cover" | "contain";
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  playMode?: "normal" | "bounce";
  bg?: ComponentBg;
  style?: StyleProp<ViewStyle>;
}) {
  const { scaleImage, scaleRadius } = useResponsiveScale();
  const LottieView = useMemo(() => getOptionalLottieView(), []);
  const width =
    props.widthMode === "full"
      ? "100%"
      : typeof props.width === "number" && props.width > 0
        ? scaleImage(props.width)
        : scaleImage(240);
  const height =
    typeof props.height === "number" && props.height > 0
      ? scaleImage(props.height)
      : scaleImage(200);
  const radius =
    typeof props.borderRadius === "number"
      ? scaleRadius(props.borderRadius)
      : 0;
  const containerStyle: StyleProp<ViewStyle> = [
    styles.container,
    {
      width,
      height,
      borderRadius: radius,
      backgroundColor: resolveSolidBg(props.bg) ?? "transparent",
    },
    props.style,
  ];

  return (
    <View style={containerStyle}>
      <ComponentGradientBg bg={props.bg} radius={radius} />
      {props.src && LottieView ? (
        <LottieView
          source={{ uri: props.src }}
          autoPlay={props.autoplay ?? true}
          loop={props.loop ?? true}
          speed={typeof props.speed === "number" ? props.speed : 1}
          resizeMode={props.resizeMode ?? "contain"}
          style={styles.fill}
        />
      ) : props.fallbackSrc ? (
        <ExpoImage
          source={{
            uri: props.fallbackSrc,
            cacheKey: createAssetCacheKey({
              bucket: props.fallbackBucket,
              path: props.fallbackPath,
              src: props.fallbackSrc,
              prefix: "animated-asset-fallback",
            }),
          }}
          cachePolicy="memory-disk"
          contentFit={props.resizeMode ?? "contain"}
          transition={160}
          style={styles.image}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            {props.src ? "Lottie" : "No animation"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
  },
  fill: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
  },
  image: {
    width: "100%",
    height: "100%",
  } satisfies ImageStyle,
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "rgba(100, 116, 139, 0.82)",
    fontSize: 12,
    fontWeight: "700",
  },
});
