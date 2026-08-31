/*
 * The complete Phosphor registry, as its own entry point on purpose: a host
 * that imports it accepts the full icon set in its bundle (the right call on
 * a device), and a host that does not import it never pays for it (the web
 * funnel measured the set at 85% of its page weight). Nothing under the
 * package's main entry may import this module.
 */
import type { ComponentType } from "react";
import * as PhosphorIcons from "phosphor-react-native";

import type {
  UiIrIconComponentProps,
  UiIrIconRegistryPort,
} from "./ports/ui-ir-icon-registry";

const iconRegistry = PhosphorIcons as unknown as Readonly<
  Record<string, ComponentType<UiIrIconComponentProps> | undefined>
>;

export const phosphorUiIrIconRegistry: UiIrIconRegistryPort = {
  resolve(name) {
    return iconRegistry[name];
  },
};
