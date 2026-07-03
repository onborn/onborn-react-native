export const NATIVE_CUSTOM_LAYOUT_PRESET_VALUES = [
  "content_focused",
  "hero",
  "hero_sheet",
  "split",
] as const;

export type NativeCustomLayoutPreset =
  (typeof NATIVE_CUSTOM_LAYOUT_PRESET_VALUES)[number];
