import type { ComponentType } from "react";
import type { StyleProp, TextStyle } from "react-native";

/**
 * The icon components a rendered artifact may summon by name.
 *
 * The registry used to be a static `import * as` of the whole Phosphor set
 * inside the renderer — correct for a device, where the artifact names icons
 * at runtime and the registry must be complete, and ruinous for the web
 * funnel, where those icons measured as 85% of the page bundle (4.6 MB of
 * 5.4 MB) while a given flow uses a handful the manifest already lists.
 *
 * So the registry is a port. The React Native host wires the complete set
 * from `@onborn/runtime-ui-ir/phosphor`; a web host supplies only what the
 * artifact's manifest names, loaded however it likes.
 */
export type UiIrIconComponentProps = {
  color?: string;
  size?: number;
  weight?: string;
  mirrored?: boolean;
  style?: StyleProp<TextStyle>;
};

export type UiIrIconRegistryPort = {
  /** The component for a canonical Phosphor export name, or undefined. */
  resolve(name: string): ComponentType<UiIrIconComponentProps> | undefined;
};
