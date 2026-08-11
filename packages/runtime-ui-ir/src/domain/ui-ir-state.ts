import type {
  BuilderV2UiIrScreen,
  BuilderV2UiIrStateCondition,
} from "@onborn/sdk-contracts/builder-v2-ui-ir";

/** The screen's named selections at one moment. */
export type UiIrStateValues = Readonly<Record<string, string | null>>;

export function initialUiIrStateValues(
  screen: Pick<BuilderV2UiIrScreen, "state">,
): UiIrStateValues {
  return Object.fromEntries(
    Object.entries(screen.state ?? {}).map(([name, s]) => [name, s.initial]),
  );
}

/**
 * The dialect's one predicate. A condition over a state the screen never
 * declared reads as not holding — the artifact was validated against its own
 * declarations at publish time, so this is defensive, not a code path.
 */
export function uiIrConditionHolds(
  values: UiIrStateValues,
  condition: BuilderV2UiIrStateCondition,
): boolean {
  const holds = (values[condition.state] ?? null) === condition.equals;
  return condition.negate ? !holds : holds;
}
