import type { ReactElement, ReactNode } from "react";
import { Circle, G, Path, Svg } from "react-native-svg";

import type {
  BuilderV2UiIrNode,
  BuilderV2UiIrVectorPaint,
} from "@onborn/sdk-contracts/builder-v2-ui-ir";

type VectorNode = Extract<
  BuilderV2UiIrNode,
  { type: "svg" | "svg-group" | "svg-path" | "svg-circle" }
>;

export function UiIrVectorNode(props: {
  node: VectorNode;
  accessibilityLabel?: string;
  children: ReactNode;
}): ReactElement {
  const paint = asPaintProps(props.node.paint);
  switch (props.node.type) {
    case "svg":
      return (
        <Svg
          accessibilityLabel={props.accessibilityLabel}
          fill={paint.fill}
          height={props.node.height}
          stroke={paint.stroke}
          strokeLinecap={paint.strokeLinecap}
          strokeLinejoin={paint.strokeLinejoin}
          strokeWidth={paint.strokeWidth}
          viewBox={props.node.viewBox}
          width={props.node.width}
        >
          {props.children}
        </Svg>
      );
    case "svg-group":
      return <G {...paint}>{props.children}</G>;
    case "svg-path":
      return <Path {...paint} d={props.node.d} />;
    case "svg-circle":
      return (
        <Circle
          {...paint}
          cx={props.node.cx}
          cy={props.node.cy}
          r={props.node.r}
        />
      );
  }
}

function asPaintProps(paint?: BuilderV2UiIrVectorPaint): {
  fill?: string;
  stroke?: string;
  strokeWidth?: string | number;
  strokeLinecap?: "butt" | "round" | "square";
  strokeLinejoin?: "miter" | "round" | "bevel";
} {
  return paint ?? {};
}
