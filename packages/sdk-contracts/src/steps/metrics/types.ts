/** Primitive keys allowed on the metrics step `primitives` map. */
export type MetricsPrimitive =
  | "age_picker"
  | "weight_picker"
  | "height_picker"
  | "title"
  | "subtitle"
  | "cta_button"
  | "progress_bar"
  | "animated_asset"
  | "y_stack"
  | "x_stack"
  | "badge"
  | "icon"
  | "skip_button"
  | "back_button";

export const METRICS_PRIMITIVE_VALUES = [
  "age_picker",
  "weight_picker",
  "height_picker",
  "title",
  "subtitle",
  "cta_button",
  "progress_bar",
  "animated_asset",
  "y_stack",
  "x_stack",
  "badge",
  "icon",
  "skip_button",
  "back_button",
] as const satisfies readonly MetricsPrimitive[];

export const METRICS_LAYOUT_PRESET_VALUES = [
  "content_focused",
  "hero",
  "hero_sheet",
  "split",
] as const;

export type MetricsLayoutPreset =
  (typeof METRICS_LAYOUT_PRESET_VALUES)[number];
