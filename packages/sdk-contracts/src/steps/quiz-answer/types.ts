/** Primitive keys allowed on the quiz answer step `primitives` map. */
export type QuizAnswerPrimitive =
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
  | "y_stack";

export const QUIZ_ANSWER_PRIMITIVE_VALUES = [
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
] as const satisfies readonly QuizAnswerPrimitive[];

export const QUIZ_ANSWER_LAYOUT_PRESET_VALUES = [
  "content_focused",
  "hero",
  "hero_sheet",
  "split",
] as const;

export type QuizAnswerLayoutPreset =
  (typeof QUIZ_ANSWER_LAYOUT_PRESET_VALUES)[number];
