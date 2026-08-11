import { useEffect, useMemo, type PropsWithChildren } from "react";
import { Animated, type ViewStyle } from "react-native";

import type {
  BuilderV2UiIrEnterTransition,
  BuilderV2UiIrStyle,
} from "@onborn/sdk-contracts/builder-v2-ui-ir";

type TimingTransition = Extract<
  BuilderV2UiIrEnterTransition,
  { type: "timing" }
>;

type UiIrLegacyAnimatedViewProps = PropsWithChildren<{
  accessibilityLabel?: string;
  style?: BuilderV2UiIrStyle;
  transition: TimingTransition;
}>;

export function UiIrLegacyAnimatedView(props: UiIrLegacyAnimatedViewProps) {
  const values = useMemo(
    () => props.transition.animations.map((animation) => new Animated.Value(animation.from)),
    [props.transition],
  );

  useEffect(() => {
    const running = Animated.parallel(
      props.transition.animations.map((animation, index) =>
        Animated.timing(values[index]!, {
          toValue: animation.to,
          duration: animation.durationMs,
          useNativeDriver: true,
        }),
      ),
    );
    running.start();
    return () => running.stop();
  }, [props.transition, values]);

  return (
    <Animated.View
      accessibilityLabel={props.accessibilityLabel}
      style={[props.style as ViewStyle | undefined, createAnimatedStyle(props.transition, values)]}
    >
      {props.children}
    </Animated.View>
  );
}

function createAnimatedStyle(
  transition: TimingTransition,
  values: readonly Animated.Value[],
): Animated.WithAnimatedValue<ViewStyle> {
  const style: Animated.WithAnimatedValue<ViewStyle> = {};
  const transform: AnimatedTransform[] = [];
  transition.animations.forEach((animation, index) => {
    const value = values[index]!;
    if (animation.property === "opacity") style.opacity = value;
    if (animation.property === "translateX") transform.push({ translateX: value });
    if (animation.property === "translateY") transform.push({ translateY: value });
    if (animation.property === "scale") transform.push({ scale: value });
  });
  if (transform.length > 0) style.transform = transform;
  return style;
}

type AnimatedTransform =
  | { translateX: Animated.Value }
  | { translateY: Animated.Value }
  | { scale: Animated.Value };
