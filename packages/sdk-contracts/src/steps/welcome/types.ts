/** Primitive keys allowed on the welcome step `primitives` map. */
export type WelcomePrimitive =
  | "image"
  | "animated_asset"
  | "title"
  | "subtitle"
  | "features"
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
  | "y_stack";

export const WELCOME_PRIMITIVE_VALUES = [
  "image",
  "animated_asset",
  "title",
  "subtitle",
  "features",
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
] as const satisfies readonly WelcomePrimitive[];

export const WELCOME_LAYOUT_PRESET_VALUES = [
  "content_focused",
  "hero",
  "hero_sheet",
  "split",
] as const;

export type WelcomeLayoutPreset = (typeof WELCOME_LAYOUT_PRESET_VALUES)[number];
