import type { WelcomePrimitive } from "../welcome";

/** Primitive keys allowed on the permissions step `primitives` map. */
export type PermissionsPrimitive = WelcomePrimitive | "toggle";

export const PERMISSIONS_PRIMITIVE_VALUES = [
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
  "toggle",
] as const satisfies readonly PermissionsPrimitive[];

export const PERMISSIONS_LAYOUT_PRESET_VALUES = [
  "content_focused",
  "hero",
  "hero_sheet",
  "split",
] as const;

export type PermissionsLayoutPreset =
  (typeof PERMISSIONS_LAYOUT_PRESET_VALUES)[number];
