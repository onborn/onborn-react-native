import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Text, XStack } from "tamagui";
import {
  resolveTextFontStyle,
  type OnbornFontWeight,
} from "../../typography/fonts";

const DEFAULT_SWITCH_WIDTH = 156;

export type MetricUnitSwitcherProps<TUnit extends string> = {
  value: TUnit;
  units: readonly TUnit[];
  bg?: string;
  activeBg?: string;
  textColor?: string;
  activeTextColor?: string;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  onChange: (unit: TUnit) => void;
};

export function MetricUnitSwitcher<TUnit extends string>({
  value,
  units,
  bg = "rgba(148, 163, 184, 0.16)",
  activeBg = "#A7F3D0",
  textColor = "#94A3B8",
  activeTextColor = "#07131C",
  borderColor = "rgba(148, 163, 184, 0)",
  borderWidth = 0,
  radius = 999,
  width = DEFAULT_SWITCH_WIDTH,
  height = 34,
  fontSize = 13,
  fontFamily,
  fontWeight = "800",
  onChange,
}: MetricUnitSwitcherProps<TUnit>) {
  const progress = useSharedValue(Math.max(0, units.indexOf(value)));
  const optionWidth = width / units.length;
  const innerHeight = Math.max(0, height - 6);

  useEffect(() => {
    progress.value = withTiming(Math.max(0, units.indexOf(value)), {
      duration: 180,
    });
  }, [progress, units, value]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * optionWidth }],
  }));

  return (
    <XStack
      style={[
        styles.unitSwitch,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: bg,
          borderColor,
          borderWidth,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.unitSwitchIndicator,
          {
            width: optionWidth - 6,
            height: innerHeight,
            borderRadius: radius,
            backgroundColor: activeBg,
          },
          indicatorStyle,
        ]}
      />
      {units.map((unit) => (
        <Pressable
          key={unit}
          style={[
            styles.unitSwitchOption,
            {
              width: optionWidth - 3,
              height: innerHeight,
            },
          ]}
          onPress={() => onChange(unit)}
        >
          <Text
            color={value === unit ? activeTextColor : textColor}
            fontSize={fontSize}
            {...resolveTextFontStyle({
              fontFamily,
              fontWeight: fontWeight as OnbornFontWeight,
            })}
          >
            {unit.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </XStack>
  );
}

const styles = StyleSheet.create({
  unitSwitch: {
    position: "relative",
    padding: 3,
  },
  unitSwitchIndicator: {
    position: "absolute",
    top: 3,
    left: 3,
  },
  unitSwitchOption: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
});
