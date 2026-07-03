/** Primitive keys allowed on the custom step `primitives` map. */
export type CustomPrimitive =
  | "image"
  | "animated_asset"
  | "title"
  | "subtitle"
  | "cta_button"
  | "input"
  | "carousel"
  | "carousel_pagination"
  | "avatar"
  | "badge"
  | "back_button"
  | "skip_button"
  | "icon"
  | "x_stack"
  | "y_stack"
  | "quiz"
  | "features"
  | "testimonial_card"
  | "loading"
  | "progress_bar"
  | "toggle";

export const CUSTOM_PRIMITIVE_VALUES = [
  "image",
  "animated_asset",
  "title",
  "subtitle",
  "cta_button",
  "input",
  "carousel",
  "carousel_pagination",
  "avatar",
  "badge",
  "back_button",
  "skip_button",
  "icon",
  "x_stack",
  "y_stack",
  "quiz",
  "features",
  "testimonial_card",
  "loading",
  "progress_bar",
  "toggle",
] as const satisfies readonly CustomPrimitive[];

export const CUSTOM_LAYOUT_PRESET_VALUES = [
  "content_focused",
  "hero",
  "hero_sheet",
  "split",
] as const;

export type CustomLayoutPreset = (typeof CUSTOM_LAYOUT_PRESET_VALUES)[number];
