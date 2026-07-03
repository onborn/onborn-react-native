import { LayoutPreset, LayoutSlot } from "@onborn/sdk-contracts";

export interface LayoutPresetConfig {
  id: LayoutPreset;
  slots: LayoutSlot[];
  flex: {
    top?: number;
    hero?: number;
    content?: number;
    bottom?: number;
  };
  spacing: {
    paddingHorizontal: number;
    paddingTop: number;
    paddingBottom: number;
    gap: number;
  };
  alignment: {
    contentAlign: "flex-start" | "center";
    contentJustify: "flex-start" | "center" | "space-between";
  };
}

export const LAYOUT_PRESETS: Record<LayoutPreset, LayoutPresetConfig> = {
  content_focused: {
    id: "content_focused",
    slots: ["top", "content", "bottom"],
    flex: {
      top: 1,
      content: 8,
      bottom: 1,
    },
    spacing: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 24,
      gap: 12,
    },
    alignment: {
      contentAlign: "center",
      contentJustify: "center",
    },
  },
  hero: {
    id: "hero",
    slots: ["hero", "content", "bottom"],
    flex: {
      hero: 0,
      content: 1,
      bottom: 0,
    },
    spacing: {
      paddingHorizontal: 24,
      paddingTop: 0,
      paddingBottom: 24,
      gap: 12,
    },
    alignment: {
      contentAlign: "center",
      contentJustify: "flex-start",
    },
  },
  hero_sheet: {
    id: "hero_sheet",
    slots: ["hero", "content", "bottom"],
    flex: {
      hero: 0,
      content: 1,
      bottom: 0,
    },
    spacing: {
      paddingHorizontal: 24,
      paddingTop: 0,
      paddingBottom: 24,
      gap: 12,
    },
    alignment: {
      contentAlign: "center",
      contentJustify: "flex-start",
    },
  },
  split: {
    id: "split",
    slots: ["content", "bottom"],
    flex: {
      content: 8,
      bottom: 1,
    },
    spacing: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 24,
      gap: 12,
    },
    alignment: {
      contentAlign: "center",
      contentJustify: "flex-start",
    },
  },
};

export function resolveLayoutPresetConfig(
  preset: LayoutPreset | undefined,
): LayoutPresetConfig {
  return LAYOUT_PRESETS[preset ?? "content_focused"];
}
