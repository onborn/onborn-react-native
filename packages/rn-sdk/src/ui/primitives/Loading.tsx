import React, { useEffect, useMemo, useState } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Text, YStack } from "tamagui";
import { useResponsiveScale } from "../responsive";
import {
  resolveTextFontStyle,
  resolveTextLineHeight,
  type OnbornFontFamily,
  type OnbornFontWeight,
  type OnbornLineHeight,
} from "../typography/fonts";

export function LoadingPrimitive(props: {
  messages?: string[];
  durationMs?: number;
  color?: string;
  size?: number;
  strokeWidth?: number;
  messageColor?: string;
  messageFontSize?: number;
  fontFamily?: OnbornFontFamily;
  fontWeight?: OnbornFontWeight;
  lineHeight?: OnbornLineHeight;
}) {
  const { scaleSpace, scaleFont } = useResponsiveScale();
  const messages = useMemo(
    () =>
      Array.isArray(props.messages) && props.messages.length > 0
        ? props.messages.filter((message) => message.trim().length > 0)
        : [
            "Analyzing your answers",
            "Building your plan",
            "Optimizing recommendations",
          ],
    [props.messages],
  );
  const [messageIndex, setMessageIndex] = useState(0);
  const durationMs = props.durationMs ?? 1400;
  const color = props.color ?? "#A7F3D0";
  const size = scaleSpace(props.size ?? 104);
  const messageFontSize = scaleFont(props.messageFontSize ?? 14);
  const strokeWidth = scaleSpace(props.strokeWidth ?? 10);
  const radius = Math.max((size - strokeWidth) / 2, 1);
  const circumference = 2 * Math.PI * radius;
  const rotation = useSharedValue(0);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(() => {
    if (messages.length <= 1) {
      return;
    }
    const interval = setInterval(() => {
      setMessageIndex((index) => (index + 1) % messages.length);
    }, durationMs);
    return () => clearInterval(interval);
  }, [durationMs, messages.length]);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1200,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [rotation]);

  return (
    <YStack width="100%" alignItems="center" gap={scaleSpace(12)}>
      <Animated.View style={ringStyle}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            opacity={0.26}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.28} ${circumference}`}
            fill="none"
          />
        </Svg>
      </Animated.View>
      <Text
        color={props.messageColor ?? "#C7D2FE"}
        fontSize={messageFontSize}
        lineHeight={resolveTextLineHeight(messageFontSize, props.lineHeight)}
        textAlign="center"
        {...resolveTextFontStyle({
          fontFamily: props.fontFamily,
          fontWeight: props.fontWeight ?? "500",
        })}
      >
        {messages[messageIndex % messages.length]}
      </Text>
    </YStack>
  );
}
