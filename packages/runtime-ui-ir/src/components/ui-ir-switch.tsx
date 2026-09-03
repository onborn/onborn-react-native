import type { ReactElement } from "react";
import {
  Platform,
  Switch,
  type StyleProp,
  type ViewStyle,
} from "react-native";

/**
 * The platform's switch as a view of one screen selection.
 *
 * The same component a screen imports and the renderer instantiates from a
 * `switch` node, so what an author type-checks against is what runs. A
 * selection is a string or null, and a switch is on or off: the switch is
 * on while the selection equals `onValue`, and a flip writes `onValue` or
 * null. React Native's Switch draws and animates the thumb on a device and
 * react-native-web's does in a browser, which is the point — a toggle built
 * from two gated Pressables teleported between its states.
 */
export function UiIrSwitch(props: {
  value: string | null;
  onChange: (value: string | null) => void;
  /** The value the selection holds while the switch is on. "on" by default. */
  onValue?: string;
  /** The track behind the thumb while on. */
  trackColor?: string;
  /** The track while off. */
  offTrackColor?: string;
  thumbColor?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Canvas markers (react-native-web data attributes); see the harness. */
  dataSet?: Record<string, string>;
}): ReactElement {
  const onValue = props.onValue ?? "on";
  const on = props.value === onValue;
  return (
    <Switch
      accessibilityLabel={props.accessibilityLabel}
      disabled={props.disabled}
      ios_backgroundColor={props.offTrackColor}
      onValueChange={(next) => props.onChange(next ? onValue : null)}
      style={props.style}
      thumbColor={props.thumbColor}
      trackColor={{ false: props.offTrackColor, true: props.trackColor }}
      value={on}
      {...webColors(props)}
      {...marker(props.dataSet)}
    />
  );
}

/*
 * react-native-web colours the on state through its own activeThumbColor
 * and activeTrackColor, which React Native's types do not know; on a device
 * the props are ignored.
 */
function webColors(props: { trackColor?: string; thumbColor?: string }): object {
  if (Platform.OS !== "web") return {};
  return {
    ...(props.trackColor ? { activeTrackColor: props.trackColor } : {}),
    ...(props.thumbColor ? { activeThumbColor: props.thumbColor } : {}),
  };
}

/*
 * react-native-web turns a dataSet prop into data-* attributes, which is how
 * the canvas finds the switch; on a device the prop is unknown and ignored.
 */
function marker(dataSet: Record<string, string> | undefined): object {
  return dataSet ? { dataSet } : {};
}
