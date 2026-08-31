import { useEffect, useRef, useState, type ReactElement } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

/**
 * A segmented control whose selection slides.
 *
 * The same component a screen imports and the renderer instantiates from a
 * `segmented-control` node, so what an author type-checks against is what
 * runs. It exists because the slide cannot be authored: the pill's position
 * is an animation driven by interaction, which the published document cannot
 * express — every hand-built switcher therefore fell back to two fills
 * swapping colour, the teleport this component replaces. The segment width is
 * measured here because it is only knowable here.
 *
 * Wiring inside, visuals outside: the container, pill and labels take their
 * styles from the caller, and the defaults below are placeholders, not a
 * design opinion.
 */
export function UiIrSegmentedControl(props: {
  segments: ReadonlyArray<{ value: string; label: string }>;
  selected: string | null;
  onSelect: (value: string) => void;
  style?: StyleProp<ViewStyle>;
  pillStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  selectedLabelStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}): ReactElement {
  const [trackWidth, setTrackWidth] = useState(0);
  const position = useRef(new Animated.Value(0)).current;
  const count = Math.max(props.segments.length, 1);
  const segmentWidth = trackWidth / count;
  const selectedIndex = Math.max(
    0,
    props.segments.findIndex((segment) => segment.value === props.selected),
  );

  useEffect(() => {
    if (segmentWidth <= 0) return;
    Animated.timing(position, {
      toValue: selectedIndex * segmentWidth,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      // The web preview drives this too, where the native driver is a no-op
      // at best; a 220ms JS-driven transform is indistinguishable by eye.
      useNativeDriver: false,
    }).start();
  }, [position, segmentWidth, selectedIndex]);

  const onTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      accessibilityRole="radiogroup"
      {...(props.accessibilityLabel
        ? { accessibilityLabel: props.accessibilityLabel }
        : {})}
      style={props.style}
    >
      <View onLayout={onTrackLayout} style={styles.track}>
        {segmentWidth > 0 ? (
          <Animated.View
            style={[
              styles.pill,
              props.pillStyle,
              { transform: [{ translateX: position }], width: segmentWidth },
            ]}
          />
        ) : null}
        {props.segments.map((segment) => {
          const selected = segment.value === props.selected;
          return (
            <Pressable
              accessibilityLabel={segment.label}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={segment.value}
              onPress={() => props.onSelect(segment.value)}
              style={styles.segment}
            >
              <Text
                style={[
                  styles.label,
                  props.labelStyle,
                  selected && props.selectedLabelStyle,
                ]}
              >
                {segment.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    position: "relative",
  },
  pill: {
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
  },
  segment: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  label: {
    textAlign: "center",
  },
});
