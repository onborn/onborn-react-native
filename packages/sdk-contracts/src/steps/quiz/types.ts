/** Primitive keys allowed on the quiz step `primitives` map. */
export type QuizPrimitive =
  | "image"
  | "animated_asset"
  | "title"
  | "subtitle"
  | "cta_button"
  | "input"
  | "quiz"
  | "avatar"
  | "badge"
  | "back_button"
  | "skip_button"
  | "icon"
  | "x_stack"
  | "y_stack";

export const QUIZ_PRIMITIVE_VALUES = [
  "image",
  "animated_asset",
  "title",
  "subtitle",
  "cta_button",
  "input",
  "quiz",
  "avatar",
  "badge",
  "back_button",
  "skip_button",
  "icon",
  "x_stack",
  "y_stack",
] as const satisfies readonly QuizPrimitive[];

export const QUIZ_LAYOUT_PRESET_VALUES = [
  "content_focused",
  "hero",
  "hero_sheet",
  "split",
] as const;

export type QuizLayoutPreset = (typeof QUIZ_LAYOUT_PRESET_VALUES)[number];
