import type { WelcomePrimitive } from "../welcome";

/** Primitive keys allowed on the benefits step `primitives` map. */
export type BenefitsPrimitive = WelcomePrimitive | "features";

export const BENEFITS_PRIMITIVE_VALUES = [
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
  "features",
] as const satisfies readonly BenefitsPrimitive[];

export const BENEFITS_LAYOUT_PRESET_VALUES = [
  "content_focused",
  "hero",
  "hero_sheet",
  "split",
] as const;

export type BenefitsLayoutPreset =
  (typeof BENEFITS_LAYOUT_PRESET_VALUES)[number];
