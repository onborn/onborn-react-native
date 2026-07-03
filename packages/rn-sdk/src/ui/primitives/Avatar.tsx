import React from "react";
import { Image as ExpoImage } from "expo-image";
import { createAssetCacheKey } from "../assets/cache";
import { useResponsiveScale } from "../responsive";

export function AvatarPrimitive(props: {
  src?: string;
  bucket?: string;
  path?: string;
  width?: number;
  height?: number;
  borderRadius?: number;
}) {
  const { scaleImage, scaleRadius } = useResponsiveScale();
  if (!props.src) {
    return null;
  }

  const width =
    typeof props.width === "number" && props.width > 0
      ? scaleImage(props.width)
      : scaleImage(96);
  const height =
    typeof props.height === "number" && props.height > 0
      ? scaleImage(props.height)
      : width;

  return (
    <ExpoImage
      source={{
        uri: props.src,
        cacheKey: createAssetCacheKey({
          bucket: props.bucket,
          path: props.path,
          src: props.src,
          prefix: "avatar",
        }),
      }}
      cachePolicy="memory-disk"
      contentFit="cover"
      transition={160}
      style={{
        width,
        height,
        borderRadius:
          typeof props.borderRadius === "number"
            ? scaleRadius(props.borderRadius)
            : Math.min(width, height) / 2,
      }}
    />
  );
}
