import { useMemo, type PropsWithChildren } from "react";
import { SafeAreaView, ScrollView, type ViewStyle } from "react-native";
import Reanimated from "react-native-reanimated";

import type {
  BuilderV2UiIrEnterTransition,
  BuilderV2UiIrExitTransition,
  BuilderV2UiIrLayoutTransition,
  BuilderV2UiIrStyle,
} from "@onborn/sdk-contracts/builder-v2-ui-ir";

import { UiIrLegacyAnimatedView } from "./ui-ir-legacy-animated-view";
import {
  createReanimatedEnterBuilder,
  createReanimatedExitBuilder,
  createReanimatedLayoutBuilder,
} from "./ui-ir-reanimated-transition";

const ReanimatedSafeAreaView = Reanimated.createAnimatedComponent(SafeAreaView);
const ReanimatedScrollView = Reanimated.createAnimatedComponent(ScrollView);

export type UiIrAnimatedContainerKind =
  | "view"
  | "safe-area-view"
  | "scroll-view";

type UiIrAnimatedViewProps = PropsWithChildren<{
  accessibilityLabel?: string;
  kind: UiIrAnimatedContainerKind;
  style?: BuilderV2UiIrStyle;
  enterTransition?: BuilderV2UiIrEnterTransition;
  exitTransition?: BuilderV2UiIrExitTransition;
  layoutTransition?: BuilderV2UiIrLayoutTransition;
}>;

export function UiIrAnimatedView(props: UiIrAnimatedViewProps) {
  if (props.enterTransition?.type === "timing") {
    if (
      props.kind !== "view" ||
      props.exitTransition ||
      props.layoutTransition
    ) {
      throw new Error(
        "Timing UI IR motion only supports a standalone View entrance.",
      );
    }
    return (
      <UiIrLegacyAnimatedView
        accessibilityLabel={props.accessibilityLabel}
        style={props.style}
        transition={props.enterTransition}
      >
        {props.children}
      </UiIrLegacyAnimatedView>
    );
  }
  return <UiIrReanimatedContainer {...props} />;
}

function UiIrReanimatedContainer(props: UiIrAnimatedViewProps) {
  const entering = useMemo(
    () =>
      props.enterTransition?.type === "reanimated"
        ? createReanimatedEnterBuilder(props.enterTransition)
        : undefined,
    [props.enterTransition],
  );
  const exiting = useMemo(
    () =>
      props.exitTransition
        ? createReanimatedExitBuilder(props.exitTransition)
        : undefined,
    [props.exitTransition],
  );
  const layout = useMemo(
    () =>
      props.layoutTransition
        ? createReanimatedLayoutBuilder(props.layoutTransition)
        : undefined,
    [props.layoutTransition],
  );
  const motionProps = {
    accessibilityLabel: props.accessibilityLabel,
    entering,
    exiting,
    layout,
    style: props.style as ViewStyle | undefined,
  };
  if (props.kind === "safe-area-view") {
    return (
      <ReanimatedSafeAreaView {...motionProps}>
        {props.children}
      </ReanimatedSafeAreaView>
    );
  }
  if (props.kind === "scroll-view") {
    return (
      <ReanimatedScrollView {...motionProps}>
        {props.children}
      </ReanimatedScrollView>
    );
  }
  return <Reanimated.View {...motionProps}>{props.children}</Reanimated.View>;
}
