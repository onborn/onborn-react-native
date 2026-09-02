import { useEffect, useRef, useState, type ReactElement } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

const DEFAULT_SIZE = 168;
const DEFAULT_STROKE = 12;
const DEFAULT_TRACK = "rgba(0, 0, 0, 0.12)";
const PULSE_MS = 420;

/**
 * A ring that fills over a fixed time, with the percent counting up.
 *
 * The same component a screen imports and the renderer instantiates. The
 * fill and the count are driven from one clock read every frame: the ring's
 * dash offset and the number are React state, so both draw the same on the
 * device and on the web, where an animated SVG prop would not. The dot's
 * orbit and the pulse are Animated transforms on the native driver.
 */
export function UiIrProgressRing(props: {
  durationMs: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor?: string;
  showsPercent?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}): ReactElement {
  const size = props.size ?? DEFAULT_SIZE;
  const strokeWidth = props.strokeWidth ?? DEFAULT_STROKE;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [fraction, setFraction] = useState(0);
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const startedAt = Date.now();
    let frame: ReturnType<typeof requestAnimationFrame> | null = null;
    const tick = () => {
      const elapsed = Math.min(1, (Date.now() - startedAt) / props.durationMs);
      setFraction(elapsed);
      if (elapsed < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const orbit = Animated.timing(rotation, {
      toValue: 1,
      duration: props.durationMs,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: PULSE_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: PULSE_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    orbit.start();
    breathe.start();
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      orbit.stop();
      breathe.stop();
    };
  }, [props.durationMs, pulse, rotation]);

  const percent = Math.round(fraction * 100);
  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  return (
    <Animated.View
      accessibilityLabel={props.accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[
        styles.wrap,
        { width: size, height: size, transform: [{ scale: pulse }] },
        props.style,
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={styles.layer}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={props.trackColor ?? DEFAULT_TRACK}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={props.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - fraction)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Animated.View
        style={[styles.layer, { width: size, height: size, transform: [{ rotate: spin }] }]}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={size / 2} cy={strokeWidth / 2} r={strokeWidth * 0.66} fill={props.color} />
        </Svg>
      </Animated.View>
      {props.showsPercent === false ? null : (
        <View style={styles.center} pointerEvents="none">
          <Text style={[styles.percent, { color: props.color }, props.textStyle]}>
            {`${percent}%`}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  percent: {
    fontSize: 36,
    fontWeight: "700",
  },
});
