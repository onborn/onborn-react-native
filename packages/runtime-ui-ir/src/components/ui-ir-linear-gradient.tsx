import type { ReactElement, ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import type {
  BuilderV2UiIrNode,
  BuilderV2UiIrStyle,
} from "@onborn/sdk-contracts/builder-v2-ui-ir";

import {
  uiIrGradientAxis,
  uiIrGradientCornerRadius,
  uiIrGradientElementId,
  uiIrGradientStops,
} from "../domain/ui-ir-gradient";

type GradientNode = Extract<BuilderV2UiIrNode, { type: "linear-gradient" }>;

/*
 * Drawn with the vector renderer the runtime already ships rather than a
 * native gradient module: one implementation reaches the app, the builder
 * canvas and the web funnel alike, and the SDK's peer list does not grow.
 * The stop geometry is the SVG default (fractions of the box), which is also
 * expo-linear-gradient's, so the document's start/end map straight across.
 */
export function UiIrLinearGradient(props: {
  node: GradientNode;
  style: BuilderV2UiIrStyle | undefined;
  accessibilityLabel?: string;
  accessibilityState?: { selected: boolean };
  children: ReactNode;
}): ReactElement {
  const id = uiIrGradientElementId(props.node.id);
  const axis = uiIrGradientAxis(props.node);
  const stops = uiIrGradientStops(props.node);
  const radius = uiIrGradientCornerRadius(props.style);
  return (
    <View
      accessibilityLabel={props.accessibilityLabel}
      accessibilityState={props.accessibilityState}
      style={props.style as ViewStyle | undefined}
    >
      {/*
       * The marker lets the preview's contrast sweep know that whatever text
       * stands on this box is on a picture, not on a colour — it becomes a
       * data attribute on the web and is ignored by native views.
       */}
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        {...({ dataSet: { onbornGradient: "1" } } as object)}
      >
        <Svg height="100%" width="100%">
          <Defs>
            <LinearGradient
              id={id}
              x1={axis.x1}
              x2={axis.x2}
              y1={axis.y1}
              y2={axis.y2}
            >
              {stops.map((stop, index) => (
                <Stop
                  key={index}
                  offset={stop.offset}
                  stopColor={stop.color}
                  stopOpacity={stop.opacity}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect
            fill={`url(#${id})`}
            height="100%"
            rx={radius}
            ry={radius}
            width="100%"
            x="0"
            y="0"
          />
        </Svg>
      </View>
      {props.children}
    </View>
  );
}
