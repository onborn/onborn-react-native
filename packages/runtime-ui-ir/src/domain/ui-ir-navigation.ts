import type { BuilderV2UiIrScreen } from "@onborn/sdk-contracts/builder-v2-ui-ir";

import { uiIrConditionHolds, type UiIrStateValues } from "./ui-ir-state";

/**
 * Where Continue leads from a screen.
 *
 * The screen's routes in order: the first whose condition holds against what
 * the journey has answered wins, an unconditional route is the default, and
 * with no route holding the journey takes the next screen in the walk. A
 * route to a screen the walk does not contain (refused at publish time; a
 * channel filter could still hide one) falls through the same way.
 */
export function resolveUiIrNextPosition(input: {
  screens: ReadonlyArray<Pick<BuilderV2UiIrScreen, "screenId" | "next">>;
  position: number;
  values: UiIrStateValues;
}): number | null {
  const current = input.screens[input.position];
  if (!current) return null;
  for (const route of current.next ?? []) {
    if (route.when && !uiIrConditionHolds(input.values, route.when)) continue;
    const target = input.screens.findIndex((screen) => screen.screenId === route.to);
    if (target >= 0) return target;
  }
  const sequential = input.position + 1;
  return sequential < input.screens.length ? sequential : null;
}
