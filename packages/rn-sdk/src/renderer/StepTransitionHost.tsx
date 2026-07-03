import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  type EntryExitAnimationFunction,
} from "react-native-reanimated";

type StepTransitionHostProps = {
  stepKey: string;
  entering: EntryExitAnimationFunction;
  exiting: EntryExitAnimationFunction;
  children: ReactNode;
};

/**
 * Hosts a single funnel step with entering/exiting layout animations.
 * Absolute fill keeps outgoing + incoming screens stacked during the transition.
 */
export function StepTransitionHost({
  stepKey,
  entering,
  exiting,
  children,
}: StepTransitionHostProps) {
  return (
    <View style={styles.host} collapsable={false}>
      <Animated.View
        key={stepKey}
        entering={entering}
        exiting={exiting}
        collapsable={false}
        style={styles.screen}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  screen: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
  },
});
