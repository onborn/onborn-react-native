import { useState, type ReactElement } from "react";
import {
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { StyleSheet } from "react-native";
import Svg, { Polyline, Rect } from "react-native-svg";

import {
  layoutUiIrChartBars,
  layoutUiIrChartLine,
  type UiIrChartPoint,
} from "../domain/ui-ir-chart";

/**
 * Draws a series.
 *
 * The props are the ones a screen author writes — `variant` and `series` — and
 * the renderer instantiates the very same component from a `chart` node. It
 * used to take the IR node instead, so the idiom the guidelines teach
 * (`<Chart variant="bar" series={SERIES} />`) could not type-check against the
 * component the guidelines told authors to import.
 *
 * Measured rather than sized from the document: the artifact describes a chart
 * and not a pixel box, so the width comes from wherever the screen put it —
 * the same reason a published screen may never compute from the device size.
 * Nothing renders until that measurement arrives, which is one frame.
 */
export function UiIrChart(props: {
  variant?: "bar" | "line";
  series: readonly UiIrChartPoint[];
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}): ReactElement {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== box.width || height !== box.height) setBox({ width, height });
  };

  return (
    <View
      accessible
      {...(props.accessibilityLabel
        ? { accessibilityLabel: props.accessibilityLabel }
        : {})}
      onLayout={onLayout}
      style={props.style}
    >
      {box.width > 0 && box.height > 0 ? (
        <Svg height={box.height} width={box.width}>
          {props.variant === "line" ? (
            <Polyline
              fill="none"
              points={layoutUiIrChartLine({
                series: props.series,
                ...box,
              })}
              stroke={strokeColor(props.style)}
              strokeWidth={2}
            />
          ) : (
            layoutUiIrChartBars({ series: props.series, ...box }).map(
              (bar, index) => (
                <Rect
                  fill={strokeColor(props.style)}
                  height={bar.height}
                  key={index}
                  rx={4}
                  width={bar.width}
                  x={bar.x}
                  y={bar.y}
                />
              ),
            )
          )}
        </Svg>
      ) : null}
    </View>
  );
}

/*
 * The screen's own colour, so a chart belongs to the theme rather than
 * introducing one. `color` is what an author reaches for on a chart, and
 * falling back to the text colour keeps it legible on either theme mode.
 */
function strokeColor(style: StyleProp<ViewStyle>): string {
  const flattened = StyleSheet.flatten(style) as
    | { color?: unknown }
    | undefined;
  return typeof flattened?.color === "string" ? flattened.color : "#111111";
}
