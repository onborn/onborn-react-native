import React from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { LAYOUT_BG_GRADIENT_PRESETS } from "@onborn/sdk-contracts";

export type ComponentBg =
  | string
  | {
      type: "linear_gradient";
      preset: keyof typeof LAYOUT_BG_GRADIENT_PRESETS;
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
  const gradient = LAYOUT_BG_GRADIENT_PRESETS[bg.preset];
  if (!gradient) {
    return null;
  }

  return (
    <LinearGradient
      pointerEvents="none"
      colors={[...gradient.colors]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.fill, { borderRadius: radius, zIndex: 0 }]}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
});
