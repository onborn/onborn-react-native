import React, { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

import type {
  BuilderV2RuntimeLottieView,
  OnbornLottieRenderProps,
} from "./lottie-capability";

/**
 * Plays the animation, or holds its first frame when the device asks for
 * less motion.
 *
 * The first frame is the fallback the authoring contract promised — every
 * declared animation carries `reducedMotionFallback: "first-frame"` — so the
 * screen keeps its artwork and loses only the movement.
 */
export function OnbornLottie(
  props: OnbornLottieRenderProps & { LottieView: BuilderV2RuntimeLottieView },
): React.JSX.Element {
  const reduceMotion = useReduceMotion();
  const { LottieView } = props;
  return (
    <LottieView
      source={props.animation}
      autoPlay={!reduceMotion}
      loop={!reduceMotion && props.loop}
      {...(reduceMotion ? { progress: 0 } : {})}
      {...(props.speed !== undefined ? { speed: props.speed } : {})}
      resizeMode={props.resizeMode ?? "contain"}
      {...(props.style ? { style: props.style } : {})}
      {...(props.accessibilityLabel
        ? { accessibilityLabel: props.accessibilityLabel }
        : {})}
    />
  );
}

function useReduceMotion(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setEnabled(value);
      })
      .catch(() => {
        // Unknown reads as "play": the setting exists to remove motion, and
        // a failed read is not a request for it.
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
