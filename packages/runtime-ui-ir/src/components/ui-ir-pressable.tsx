import { useEffect, type ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import type { BuilderV2UiIrNode } from "@onborn/sdk-contracts/builder-v2-ui-ir";

import type { UiIrRendererPorts } from "../ports/ui-ir-renderer";
import { createUiIrNodeCommonProps } from "./ui-ir-node-props";

type PressableNode = Extract<BuilderV2UiIrNode, { type: "pressable" }>;

type UiIrPressableProps = {
  node: PressableNode;
  screenId: string;
  ports: UiIrRendererPorts;
  children: ReactNode;
};

export function UiIrPressable(props: UiIrPressableProps) {
  const scale = useSharedValue(props.node.feedback?.scale?.idle ?? 1);
  const opacity = useSharedValue(props.node.feedback?.opacity?.idle ?? 1);

  useEffect(() => {
    scale.value = props.node.feedback?.scale?.idle ?? 1;
    opacity.value = props.node.feedback?.opacity?.idle ?? 1;
  }, [opacity, props.node.feedback, scale]);

  const common = createUiIrNodeCommonProps(props.node);
  const hasScaleFeedback = Boolean(props.node.feedback?.scale);
  const hasOpacityFeedback = Boolean(props.node.feedback?.opacity);
  const animatedStyle = useAnimatedStyle(
    () => ({
      ...(hasOpacityFeedback ? { opacity: opacity.value } : {}),
      ...(hasScaleFeedback ? { transform: [{ scale: scale.value }] } : {}),
    }),
    [hasOpacityFeedback, hasScaleFeedback],
  );
  return (
    <Animated.View style={[asViewStyle(props.node.style), animatedStyle]}>
      <Pressable
        {...common}
        disabled={props.node.disabled}
        onPress={() => handlePress(props)}
        onPressIn={() => {
          animateFeedback(props.node, scale, opacity, true);
          triggerHaptic(props);
        }}
        onPressOut={() => animateFeedback(props.node, scale, opacity, false)}
        style={asPressableStyle(props.node.contentStyle)}
      >
        {props.children}
      </Pressable>
    </Animated.View>
  );
}

function handlePress(props: UiIrPressableProps): void {
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

function asPressableStyle(
  style: PressableNode["contentStyle"],
): PressableProps["style"] {
  return style as ViewStyle | undefined;
}
