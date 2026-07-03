import React, { createContext, useContext, useMemo, useState } from "react";
import { View, type LayoutChangeEvent, type ViewStyle } from "react-native";

const BASE_WIDTH = 402;
const BASE_HEIGHT = 874;

type ResponsiveMetrics = {
  width: number;
  height: number;
  fixed: boolean;
  spaceScale: number;
  fontScale: number;
  radiusScale: number;
  imageScale: number;
};

const DEFAULT_METRICS = createMetrics(BASE_WIDTH, BASE_HEIGHT);

const ResponsiveContext = createContext<ResponsiveMetrics>(DEFAULT_METRICS);

export function ResponsiveProvider({
  children,
  style,
  fixedSize,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  fixedSize?: { width: number; height: number };
}) {
  const [size, setSize] = useState({
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
  });
  const effectiveSize = fixedSize ?? size;

  const metrics = useMemo(
    () => ({
      ...createMetrics(effectiveSize.width, effectiveSize.height),
      fixed: Boolean(fixedSize),
    }),
    [effectiveSize.height, effectiveSize.width, fixedSize],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) {
      return;
    }
    setSize((current) => {
      const nextWidth = Math.round(width);
      const nextHeight = Math.round(height);
      if (current.width === nextWidth && current.height === nextHeight) {
        return current;
      }
      return { width: nextWidth, height: nextHeight };
    });
  };

  return (
    <ResponsiveContext.Provider value={metrics}>
      <View onLayout={fixedSize ? undefined : handleLayout} style={style}>
        {children}
      </View>
    </ResponsiveContext.Provider>
  );
}

export function useResponsiveScale() {
  const metrics = useContext(ResponsiveContext);

  return useMemo(
    () => ({
      metrics,
      scaleSpace: (value: number) => scaleNumber(value, metrics.spaceScale),
      scaleFont: (value: number) => scaleNumber(value, metrics.fontScale),
      scaleRadius: (value: number) => scaleNumber(value, metrics.radiusScale),
      scaleImage: (value: number) => scaleNumber(value, metrics.imageScale),
    }),
    [metrics],
  );
}

function createMetrics(width: number, height: number): ResponsiveMetrics {
  const widthScale = width / BASE_WIDTH;
  const heightScale = height / BASE_HEIGHT;
  const compactHeightScale = height < 700 ? 0.9 : height < 760 ? 0.95 : 1;

  return {
    width,
    height,
    fixed: false,
    spaceScale: clamp(widthScale * compactHeightScale, 0.78, 1.08),
    fontScale: clamp(widthScale, 0.9, 1.06),
    radiusScale: clamp(widthScale, 0.86, 1.05),
    imageScale: clamp(Math.min(widthScale, heightScale), 0.78, 1.08),
  };
}

function scaleNumber(value: number, scale: number): number {
  if (value === 0) {
    return 0;
  }
  return Math.round(value * scale);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
