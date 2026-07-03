import { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useResponsiveScale } from "../responsive";

export function ProgressBar(props: {
  variant?: "bar" | "dots";
  value?: number;
  height?: number;
  borderRadius?: number;
  indicatorBg?: string;
  trackBg?: string;
  dotSize?: number;
  activeDotWidth?: number;
  gap?: number;
  align?: "left" | "center" | "right";
  activeStepIndex?: number;
  stepCount?: number;
  style?: StyleProp<ViewStyle>;
  animationKey?: string;
}) {
  const { scaleRadius, scaleSpace } = useResponsiveScale();
  const normalized = Math.max(0, Math.min(100, props.value ?? 0));
  const progress = useSharedValue(
    props.animationKey
      ? (lastProgressValues.get(props.animationKey) ?? normalized)
      : normalized,
  );
  const indicatorColor = props.indicatorBg ?? "#5F6FFF";
  const trackColor = props.trackBg ?? "#2B334088";
  const barHeight = scaleSpace(props.height ?? 8);
  const radius = scaleRadius(props.borderRadius ?? 999);
  const variant = props.variant ?? "bar";
  const dotSize = Math.max(4, scaleSpace(props.dotSize ?? 8));
  const activeDotWidth = Math.max(
    dotSize,
    scaleSpace(props.activeDotWidth ?? dotSize * 2.25),
  );
  const gap = Math.max(0, scaleSpace(props.gap ?? 8));
  const stepCount = Math.max(1, Math.floor(props.stepCount ?? 4));
  const [dotsWidth, setDotsWidth] = useState(0);
  const activeStepIndex =
    typeof props.activeStepIndex === "number"
      ? props.activeStepIndex
      : Math.round((normalized / 100) * (stepCount - 1));
  const clampedActiveIndex = Math.max(
    0,
    Math.min(stepCount - 1, activeStepIndex),
  );
  const dotsMetrics = useMemo(() => {
    const naturalWidth =
      activeDotWidth + Math.max(0, stepCount - 1) * (dotSize + gap);
    const scale =
      dotsWidth > 0 && naturalWidth > dotsWidth
        ? Math.max(0.35, dotsWidth / naturalWidth)
        : 1;
    const scaledDotSize = Math.max(3, dotSize * scale);
    return {
      dotSize: scaledDotSize,
      activeDotWidth: Math.max(scaledDotSize, activeDotWidth * scale),
      gap: Math.max(0, gap * scale),
    };
  }, [activeDotWidth, dotSize, dotsWidth, gap, stepCount]);

  useEffect(() => {
    if (props.animationKey) {
      lastProgressValues.set(props.animationKey, normalized);
    }
    progress.value = withSpring(normalized, {
      damping: 22,
      mass: 0.8,
      stiffness: 180,
      overshootClamping: true,
      energyThreshold: 0.001,
    });
  }, [normalized, progress, props.animationKey]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  if (variant === "dots") {
    return (
      <View
        style={[
          styles.container,
          props.style,
        ]}
      >
        <View
          style={[
            styles.dots,
            {
              justifyContent: alignToJustifyContent(props.align),
            },
          ]}
          onLayout={(event) => {
            const nextWidth = event.nativeEvent.layout.width;
            setDotsWidth((current) =>
              Math.abs(current - nextWidth) > 0.5 ? nextWidth : current,
            );
          }}
        >
          {Array.from({ length: stepCount }, (_, index) => (
            <ProgressDot
              key={index}
              index={index}
              activeIndex={clampedActiveIndex}
              dotSize={dotsMetrics.dotSize}
              activeDotWidth={dotsMetrics.activeDotWidth}
              gap={dotsMetrics.gap}
              activeColor={indicatorColor}
              inactiveColor={trackColor}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        props.style,
      ]}
    >
      <View
        style={[
          styles.track,
          {
            height: barHeight,
            borderRadius: radius,
            backgroundColor: trackColor,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.indicator,
            {
              borderRadius: radius,
              backgroundColor: indicatorColor,
            },
            indicatorStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    flexShrink: 1,
  },
  track: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    flexShrink: 1,
    overflow: "hidden",
  },
  dots: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  indicator: {
    height: "100%",
  },
});

const lastProgressValues = new Map<string, number>();

function ProgressDot({
  index,
  activeIndex,
  dotSize,
  activeDotWidth,
  gap,
  activeColor,
  inactiveColor,
}: {
  index: number;
  activeIndex: number;
  dotSize: number;
  activeDotWidth: number;
  gap: number;
  activeColor: string;
  inactiveColor: string;
}) {
  const activation = useSharedValue(index === activeIndex ? 1 : 0);

  useEffect(() => {
    activation.value = withSpring(index === activeIndex ? 1 : 0, {
      damping: 20,
      mass: 0.7,
      stiffness: 220,
      overshootClamping: true,
      energyThreshold: 0.001,
    });
  }, [activation, activeIndex, index]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: interpolate(activation.value, [0, 1], [dotSize, activeDotWidth]),
      opacity: interpolate(activation.value, [0, 1], [0.42, 1]),
      backgroundColor: interpolateColor(
        activation.value,
        [0, 1],
        [inactiveColor, activeColor],
      ),
    };
  }, [activeColor, activeDotWidth, dotSize, inactiveColor]);

  return (
    <Animated.View
      style={[
        {
          height: dotSize,
          marginLeft: index === 0 ? 0 : gap,
          borderRadius: dotSize / 2,
          backgroundColor: inactiveColor,
        },
        animatedStyle,
      ]}
    />
  );
}

function alignToJustifyContent(
  align: "left" | "center" | "right" | undefined,
): "flex-start" | "center" | "flex-end" {
  if (align === "right") {
    return "flex-end";
  }
  if (align === "center") {
    return "center";
  }
  return "flex-start";
}
