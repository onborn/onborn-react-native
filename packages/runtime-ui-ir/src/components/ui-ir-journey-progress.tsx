import { useEffect, useRef, type ReactElement } from "react";
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { uiIrJourneyProgress } from "../domain/ui-ir-journey-progress";
import { useUiIrJourneyProgressContext } from "./ui-ir-journey-progress-context";

/*
 * The same spring the reference apps use for their bar; a settle that is
 * felt rather than watched.
 */
const SPRING = { damping: 15, stiffness: 100, useNativeDriver: false };

/**
 * A progress bar wired to the journey.
 *
 * The same component a screen imports and the renderer instantiates: on the
 * canvas the screen passes the journey's real position and total, on the
 * device the renderer leaves them out and the journey context answers. The
 * fill starts where the previous screen's bar ended and springs to its own
 * value — the animation across a screen change every native onboarding has,
 * which a per-screen View could never perform.
 */
export function UiIrJourneyProgress(props: {
  position?: number;
  total?: number;
  from?: number;
  style?: StyleProp<ViewStyle>;
  fillStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}): ReactElement {
  const context = useUiIrJourneyProgressContext();
  const position = props.position ?? context.position ?? 0;
  const total = props.total ?? context.total ?? 1;
  const target = uiIrJourneyProgress({ position, total, from: props.from });
  // The first bar the journey shows stands still; every later one grows in.
  const fraction = useRef(
    new Animated.Value(context.remembered.current ?? target),
  ).current;
  useEffect(() => {
    context.remembered.current = target;
    const animation = Animated.spring(fraction, { toValue: target, ...SPRING });
    animation.start();
    return () => animation.stop();
  }, [context.remembered, fraction, target]);
  const width = fraction.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  return (
    <View
      accessibilityLabel={props.accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(target * 100) }}
      style={[styles.track, props.style]}
    >
      <Animated.View style={[styles.fill, props.fillStyle, { width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
});
