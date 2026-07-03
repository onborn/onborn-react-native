import React from "react";
import { Pressable } from "react-native";
import { XStack } from "tamagui";
import { useResponsiveScale } from "../responsive";

export function TogglePrimitive(props: {
  id?: string;
  value?: boolean;
  thumbColor?: string;
  trackColor?: string;
  activeThumbColor?: string;
  activeTrackColor?: string;
  disableInteractionState?: boolean;
  onChange?: (value: boolean) => void;
}) {
  const { scaleRadius, scaleSpace } = useResponsiveScale();
  const checked = props.value === true;
  const trackWidth = scaleSpace(52);
  const trackHeight = scaleSpace(30);
  const thumbSize = scaleSpace(24);
  const trackPadding = scaleSpace(3);
  const thumbOffset = checked ? trackWidth - thumbSize - trackPadding * 2 : 0;
  const trackColor = checked
    ? (props.activeTrackColor ?? "#A7F3D0")
    : (props.trackColor ?? "#2B3340");
  const thumbColor = checked
    ? (props.activeThumbColor ?? "#FFFFFF")
    : (props.thumbColor ?? "#FFFFFF");

  return (
    <Pressable
      pointerEvents={props.disableInteractionState ? "none" : undefined}
      onPress={() => props.onChange?.(!checked)}
    >
      <XStack
        width={trackWidth}
        height={trackHeight}
        borderRadius={scaleRadius(999)}
        padding={trackPadding}
        backgroundColor={trackColor}
        alignItems="center"
      >
        <XStack
          width={thumbSize}
          height={thumbSize}
          borderRadius={scaleRadius(999)}
          backgroundColor={thumbColor}
          transform={[{ translateX: thumbOffset }]}
        />
      </XStack>
    </Pressable>
  );
}
