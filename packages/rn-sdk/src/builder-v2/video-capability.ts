import type { ComponentType } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import type { BuilderV2UiIrJsonValue } from "@onborn/sdk-contracts";

/**
 * The shape of expo-video that a flow relies on.
 *
 * Typed structurally rather than imported, exactly as the Lottie player is:
 * expo-video is an optional peer with a native module and a config plugin,
 * and importing its types here would make every host resolve it whether or
 * not its flows ever play a clip. An app lends what it already has —
 * `import { VideoView, useVideoPlayer } from "expo-video"` — and the SDK
 * only asks for the props a compiled node can set.
 */
export type BuilderV2RuntimeVideoPlayer = {
  loop: boolean;
  muted: boolean;
  play(): void;
  pause(): void;
};

export type BuilderV2RuntimeVideoView = ComponentType<{
  player: BuilderV2RuntimeVideoPlayer;
  style?: StyleProp<ViewStyle>;
  contentFit?: "cover" | "contain";
  nativeControls?: boolean;
  accessibilityLabel?: string;
}>;

export type BuilderV2RuntimeVideo = {
  VideoView: BuilderV2RuntimeVideoView;
  useVideoPlayer: (
    source: { uri: string },
    setup?: (player: BuilderV2RuntimeVideoPlayer) => void,
  ) => BuilderV2RuntimeVideoPlayer;
};

/**
 * What a `video` node hands the host's player.
 *
 * The runtime resolved the file from the artifact before this is called —
 * a path on the device — so the host plays what it is given and never
 * fetches anything.
 */
export type OnbornVideoRenderProps = {
  uri: string;
  loop: boolean;
  muted: boolean;
  resizeMode: "cover" | "contain";
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function readVideoRenderProps(
  input: BuilderV2UiIrJsonValue,
): OnbornVideoRenderProps {
  const value = (input ?? {}) as Record<string, unknown>;
  if (typeof value.uri !== "string" || value.uri === "") {
    throw new Error("A video node arrived without its file.");
  }
  return {
    uri: value.uri,
    loop: value.loop !== false,
    muted: value.muted !== false,
    resizeMode: value.resizeMode === "contain" ? "contain" : "cover",
    ...(typeof value.style === "object" && value.style !== null
      ? { style: value.style as StyleProp<ViewStyle> }
      : {}),
    ...(typeof value.accessibilityLabel === "string"
      ? { accessibilityLabel: value.accessibilityLabel }
      : {}),
  };
}
