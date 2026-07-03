import React, { useMemo } from "react";
import type { ImageStyle, StyleProp } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { createAssetCacheKey } from "../assets/cache";
import { useResponsiveScale } from "../responsive";

export function ImagePrimitive(props: {
  src?: string;
  bucket?: string;
  path?: string;
  width?: number;
  height?: number;
  borderRadius?: number;
  widthMode?: "card" | "full";
  heightMode?: "fixed" | "aspect";
  aspectRatio?: number;
  resizeMode?: "cover" | "contain";
  style?: StyleProp<ImageStyle>;
}) {
  const { scaleImage, scaleRadius } = useResponsiveScale();
  const source = useMemo(
    () => ({
      uri: props.src ?? "",
      cacheKey: createAssetCacheKey({
        bucket: props.bucket,
        path: props.path,
        src: props.src,
        prefix: "image",
      }),
    }),
    [props.bucket, props.path, props.src],
  );
  if (!props.src) {
    return null;
  }

  // "aspect" mode sizes height from width via aspectRatio (width / height),
  // letting full-width hero media scale with the screen instead of a fixed
  // height. Falls back to "fixed" when no aspectRatio is provided.
  const useAspect =
    props.heightMode === "aspect" &&
    typeof props.aspectRatio === "number" &&
    props.aspectRatio > 0;

  return (
    <ExpoImage
      source={source}
      cachePolicy="memory-disk"
      contentFit={props.resizeMode ?? "cover"}
      transition={160}
      style={[
        {
          width:
            props.widthMode === "full"
              ? "100%"
              : typeof props.width === "number" && props.width > 0
                ? scaleImage(props.width)
                : scaleImage(240),
          ...(useAspect
            ? { aspectRatio: props.aspectRatio }
            : {
                height:
                  typeof props.height === "number" && props.height > 0
                    ? scaleImage(props.height)
                    : scaleImage(200),
              }),
          borderRadius:
            typeof props.borderRadius === "number"
              ? scaleRadius(props.borderRadius)
              : 0,
        },
        props.style,
      ]}
    />
  );
}
