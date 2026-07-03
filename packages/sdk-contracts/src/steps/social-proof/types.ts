/** Primitive keys allowed on the social proof step `primitives` map. */
export type SocialProofPrimitive =
  | "image"
  | "animated_asset"
  | "title"
  | "subtitle"
  | "cta_button"
  | "carousel"
  | "carousel_pagination"
  | "testimonial_card"
  | "features"
  | "avatar"
  | "badge"
  | "skip_button"
  | "icon"
  | "x_stack"
  | "y_stack";

export const SOCIAL_PROOF_PRIMITIVE_VALUES = [
  "image",
  "animated_asset",
  "title",
  "subtitle",
  "cta_button",
  "carousel",
  "carousel_pagination",
  "testimonial_card",
  "features",
  "avatar",
  "badge",
  "skip_button",
  "icon",
  "x_stack",
  "y_stack",
] as const satisfies readonly SocialProofPrimitive[];

export const SOCIAL_PROOF_LAYOUT_PRESET_VALUES = [
  "content_focused",
  "hero",
  "hero_sheet",
  "split",
] as const;

export type SocialProofLayoutPreset =
  (typeof SOCIAL_PROOF_LAYOUT_PRESET_VALUES)[number];
