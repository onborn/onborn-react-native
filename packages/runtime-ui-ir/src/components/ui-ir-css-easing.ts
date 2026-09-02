import { cubicBezier } from "react-native-reanimated";

import type { BuilderV2UiIrStyle } from "@onborn/sdk-contracts/builder-v2-ui-ir";

import { materializeUiIrCssEasing } from "../domain/ui-ir-css-easing";

/**
 * A node style Reanimated's CSS engine will accept: every cubic-bezier timing
 * string becomes the `cubicBezier()` easing it insists on. Named curves stay
 * strings. See the domain module for why the dialect holds strings at all.
 */
export function toReanimatedCssStyle(
  style: BuilderV2UiIrStyle | undefined,
): BuilderV2UiIrStyle | undefined {
  return materializeUiIrCssEasing(style, ([x1, y1, x2, y2]) =>
    cubicBezier(x1, y1, x2, y2),
  );
}
