import React, { useEffect } from "react";
import { AccessibilityInfo } from "react-native";

import type {
  BuilderV2RuntimeVideo,
  OnbornVideoRenderProps,
} from "./video-capability";

/**
 * Plays the clip through the lent expo-video player, muted and looping as
 * the node says, or holds its first frame when the device asks for less
 * motion — the same courtesy the Lottie renderer extends.
 */
export function OnbornVideo(
  props: OnbornVideoRenderProps & { video: BuilderV2RuntimeVideo },
): React.JSX.Element {
  const reduceMotion = useReduceMotion();
  const { VideoView, useVideoPlayer } = props.video;
  const player = useVideoPlayer({ uri: props.uri }, (instance) => {
    instance.loop = props.loop;
    instance.muted = props.muted;
  });
  useEffect(() => {
    if (reduceMotion) {
      player.pause();
    } else {
      player.play();
    }
  }, [player, reduceMotion]);
  return (
    <VideoView
      player={player}
      contentFit={props.resizeMode}
      nativeControls={false}
      {...(props.style ? { style: props.style } : {})}
      {...(props.accessibilityLabel
        ? { accessibilityLabel: props.accessibilityLabel }
        : {})}
    />
  );
}

function useReduceMotion(): boolean {
  const [enabled, setEnabled] = React.useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setEnabled(value);
      })
      .catch(() => {
        // Unknown reads as "play"; the setting exists to remove motion.
      });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => setEnabled(value),
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return enabled;
}
