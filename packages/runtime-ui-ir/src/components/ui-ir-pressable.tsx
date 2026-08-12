import { useEffect, useState, type ReactNode } from "react";
import { Pressable, type ViewStyle } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import type { BuilderV2UiIrNode } from "@onborn/sdk-contracts/builder-v2-ui-ir";

import type { UiIrRendererPorts } from "../ports/ui-ir-renderer";
import { placeUiIrPressableStyles } from "../domain/ui-ir-pressable-styles";
import { uiIrConditionHolds } from "../domain/ui-ir-state";
import { useUiIrScreenState } from "./ui-ir-screen-state";

type PressableNode = Extract<BuilderV2UiIrNode, { type: "pressable" }>;

type UiIrPressableProps = {
  node: PressableNode;
  screenId: string;
  ports: UiIrRendererPorts;
  /** Already resolved against the document and locale by the caller. */
  accessibilityLabel?: string;
  /** Reported to the screen reader, resolved by the caller. */
  accessibilityState?: { selected: boolean };
  /** The node's style with active variants merged, resolved by the caller. */
  style?: PressableNode["style"];
  children: ReactNode;
};

export function UiIrPressable(props: UiIrPressableProps) {
  const scale = useSharedValue(props.node.feedback?.scale?.idle ?? 1);
  const opacity = useSharedValue(props.node.feedback?.opacity?.idle ?? 1);

  useEffect(() => {
    scale.value = props.node.feedback?.scale?.idle ?? 1;
    opacity.value = props.node.feedback?.opacity?.idle ?? 1;
  }, [opacity, props.node.feedback, scale]);

  const screenState = useUiIrScreenState();
  /*
   * Disabled may be a fact or a condition — "until something is selected". The
   * screen reader hears the same answer the touch system enforces.
   */
  const disabled =
    typeof props.node.disabled === "object"
      ? uiIrConditionHolds(screenState.values, props.node.disabled)
      : (props.node.disabled ?? false);
  const common = {
    ...(props.accessibilityLabel
      ? { accessibilityLabel: props.accessibilityLabel }
      : {}),
    accessibilityState: { ...props.accessibilityState, disabled },
  };
  const hasScaleFeedback = Boolean(props.node.feedback?.scale);
  const hasOpacityFeedback = Boolean(props.node.feedback?.opacity);
  const animatedStyle = useAnimatedStyle(
    () => ({
      ...(hasOpacityFeedback ? { opacity: opacity.value } : {}),
      ...(hasScaleFeedback ? { transform: [{ scale: scale.value }] } : {}),
    }),
    [hasOpacityFeedback, hasScaleFeedback],
  );
  const [pressed, setPressed] = useState(false);
  const placed = placeUiIrPressableStyles({
    style: props.style ?? props.node.style,
    pressedStyle: props.node.pressedStyle,
    contentStyle: props.node.contentStyle,
    pressed,
  });

  return (
    <Animated.View
      style={[
        ...placed.container.map((style) =>
          asViewStyle(style as PressableNode["style"]),
        ),
        animatedStyle,
      ]}
    >
      <Pressable
        {...common}
        disabled={disabled}
        onPress={() => handlePress(props, screenState.set)}
        onPressIn={() => {
          setPressed(true);
          animateFeedback(props.node, scale, opacity, true);
          triggerHaptic(props);
        }}
        onPressOut={() => {
          setPressed(false);
          animateFeedback(props.node, scale, opacity, false);
        }}
        style={placed.pressable.map((style) =>
          asViewStyle(style as PressableNode["style"]),
        )}
      >
        {props.children}
      </Pressable>
    </Animated.View>
  );
}

function handlePress(
  props: UiIrPressableProps,
  setState: (state: string, value: string | null) => void,
): void {
  /*
   * Selection is the screen's own affair; it never leaves the device, so it is
   * not a port. Everything else stays host-handled.
   */
  if (props.node.action.type === "state.set") {
    setState(props.node.action.state, props.node.action.value);
    return;
  }
  void props.ports.handleAction({
    screenId: props.screenId,
    nodeId: props.node.id,
    action: props.node.action,
  });
}

function triggerHaptic(props: UiIrPressableProps): void {
  const haptic = props.node.feedback?.haptic;
  if (!haptic) return;
  void Promise.resolve(
    props.ports.handleAction({
      screenId: props.screenId,
      nodeId: props.node.id,
      action: {
        type: "capability.invoke",
        capability: "haptics",
        method: "trigger",
        input: haptic,
      },
    }),
  ).catch(() => undefined);
}

function animateFeedback(
  node: PressableNode,
  scale: SharedValue<number>,
  opacity: SharedValue<number>,
  pressed: boolean,
): void {
  if (node.feedback?.scale) {
    scale.value = withTiming(
      pressed ? node.feedback.scale.pressed : node.feedback.scale.idle,
      {
        duration: pressed
          ? node.feedback.scale.pressInDurationMs
          : node.feedback.scale.pressOutDurationMs,
        reduceMotion: ReduceMotion.System,
      },
    );
  }
  if (node.feedback?.opacity) {
    opacity.value = withTiming(
      pressed ? node.feedback.opacity.pressed : node.feedback.opacity.idle,
      {
        duration: pressed
          ? node.feedback.opacity.pressInDurationMs
          : node.feedback.opacity.pressOutDurationMs,
        reduceMotion: ReduceMotion.System,
      },
    );
  }
}

function asViewStyle(style: PressableNode["style"]): ViewStyle | undefined {
  return style as ViewStyle | undefined;
}
