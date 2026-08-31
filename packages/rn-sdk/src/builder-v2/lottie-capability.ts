import type { ComponentType } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import type { BuilderV2UiIrJsonValue } from "@onborn/sdk-contracts";

/**
 * The shape of `LottieView` from lottie-react-native that a flow relies on.
 *
 * Typed structurally rather than imported: the package is an optional peer,
 * and importing its types here would make every host resolve it whether or
 * not its flows ever animate. An app lends the component it already has —
 * `import LottieView from "lottie-react-native"` — and the SDK only asks
 * for the props a compiled node can set.
 */
export type BuilderV2RuntimeLottieView = ComponentType<{
  source: object;
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  progress?: number;
  resizeMode?: "cover" | "contain" | "center";
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}>;

export type BuilderV2RuntimeLottie = {
  LottieView: BuilderV2RuntimeLottieView;
};

/**
 * What a `lottie` node hands the host's player.
 *
 * The runtime resolves the animation from the artifact before this is
 * called, so the host renders what it is given and never fetches anything.
 */
export type OnbornLottieRenderProps = {
  animation: object;
  loop: boolean;
  speed?: number;
  resizeMode?: "cover" | "contain" | "center";
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function readLottieRenderProps(
  input: BuilderV2UiIrJsonValue,
): OnbornLottieRenderProps {
  const value = (input ?? {}) as Record<string, unknown>;
  if (typeof value.animation !== "object" || value.animation === null) {
    throw new Error("A lottie node arrived without its animation.");
  }
  const resizeMode = value.resizeMode;
  return {
    animation: value.animation,
    loop: value.loop !== false,
    ...(typeof value.speed === "number" ? { speed: value.speed } : {}),
    ...(resizeMode === "cover" ||
    resizeMode === "contain" ||
    resizeMode === "center"
      ? { resizeMode }
      : {}),
    ...(typeof value.style === "object" && value.style !== null
      ? { style: value.style as StyleProp<ViewStyle> }
      : {}),
    ...(typeof value.accessibilityLabel === "string"
      ? { accessibilityLabel: value.accessibilityLabel }
      : {}),
  };
}
