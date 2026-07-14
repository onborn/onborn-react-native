import React from "react";
import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import {
  gradientAngleToStartEnd,
  resolveGradient,
} from "@onborn/sdk-contracts";

export type ComponentBg =
  | string
  | {
      type: "linear_gradient";
      preset?: string;
      angle?: number;
      stops?: { color: string; position?: number }[];
    }
  | {
      type: "blur";
      intensity?: number;
      tintColor?: string;
      opacity?: number;
    };

export function resolveSolidBg(bg: ComponentBg | undefined): string | undefined {
  return typeof bg === "string" ? bg : undefined;
}

export function ComponentGradientBg({
  bg,
  radius,
}: {
  bg?: ComponentBg;
  radius: number;
}) {
  if (!bg || typeof bg === "string") {
    return null;
  }
  if (bg.type === "blur") {
    const intensity =
      typeof bg.intensity === "number"
        ? Math.min(100, Math.max(0, bg.intensity))
        : 24;
    const tintOpacity =
      typeof bg.opacity === "number" ? Math.min(1, Math.max(0, bg.opacity)) : 0.28;
    const tintColor = bg.tintColor ?? "rgba(255,255,255,0.28)";

    return (
      <View pointerEvents="none" style={[styles.fill, { borderRadius: radius }]}>
        <BlurView
          pointerEvents="none"
          intensity={intensity}
          tint="systemUltraThinMaterial"
          style={[styles.fill, { borderRadius: radius, overflow: "hidden", zIndex: 0 }]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.fill,
            {
              borderRadius: radius,
              zIndex: 1,
              backgroundColor: tintColor,
              opacity: tintOpacity,
            },
          ]}
        />
      </View>
    );
  }
  // A gradient object with neither a valid preset nor stops resolves to the
  // fallback; only render when the author actually asked for a gradient.
  if (!bg.preset && !(bg.stops && bg.stops.length >= 2)) {
    return null;
  }
  const { colors, locations, angle } = resolveGradient(bg);
  const { start, end } = gradientAngleToStartEnd(angle);

  return (
    <LinearGradient
      pointerEvents="none"
      colors={colors as [string, string, ...string[]]}
      locations={locations as [number, number, ...number[]] | undefined}
      start={start}
      end={end}
      style={[styles.fill, { borderRadius: radius, zIndex: 0 }]}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
  },
});
