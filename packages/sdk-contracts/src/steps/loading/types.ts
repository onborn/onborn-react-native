/** Primitive keys allowed on the loading step `primitives` map. */
export type LoadingPrimitive =
  | "loading"
  | "title"
  | "subtitle"
  | "image"
  | "animated_asset"
  | "icon"
  | "badge"
  | "carousel"
  | "carousel_pagination"
  | "x_stack"
  | "y_stack";

export const LOADING_PRIMITIVE_VALUES = [
  "loading",
  "title",
  "subtitle",
  "image",
  "animated_asset",
  "icon",
  "badge",
  "carousel",
  "carousel_pagination",
  "x_stack",
  "y_stack",
] as const satisfies readonly LoadingPrimitive[];

export const LOADING_LAYOUT_PRESET_VALUES = [
  "content_focused",
  "hero",
  "hero_sheet",
  "split",
] as const;

export type LoadingLayoutPreset = (typeof LOADING_LAYOUT_PRESET_VALUES)[number];
