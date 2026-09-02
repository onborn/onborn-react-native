import type {
  BuilderV2UiIrCondition,
  BuilderV2UiIrJourneyCondition,
  BuilderV2UiIrScreen,
  BuilderV2UiIrStateCondition,
} from "@onborn/sdk-contracts/builder-v2-ui-ir";

import {
  uiIrPlanConditionHolds,
  type UiIrPlanSnapshot,
} from "./ui-ir-plans";

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
 * A screen's values as they may leave the device.
 *
 * A selection is one of a few known options and is reported as it is. Free
 * text is a person's own words — usually their name — so it is reported as
 * "provided" (or null when empty) unless the field asked for the value to be
 * reported. The document made this decision at publish time; here it is only
 * applied.
 */
export function reportedUiIrAnswers(
  screen: Pick<BuilderV2UiIrScreen, "state">,
  values: UiIrStateValues,
): UiIrStateValues {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => {
      const declaration = screen.state?.[name];
      if (!declaration?.text || declaration.text.report === "value") {
        return [name, value];
      }
      return [name, value && value.trim() !== "" ? "provided" : null];
    }),
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

/**
 * Evaluates whichever predicate a gated appearance was written with.
 *
 * One reader for both kinds, matching the compiler: a second evaluator would
 * eventually understand a predicate the first does not, and a condition that
 * holds in one attribute but not another is the worst kind of rendering bug to
 * find.
 */
export function uiIrGateHolds(
  condition: BuilderV2UiIrCondition,
  context: {
    values: UiIrStateValues;
    plans: UiIrPlanSnapshot;
    currentPlanIndex: number | null;
    /** Where the journey stands; absent outside a journey (a bare screen). */
    journey?: UiIrJourneyGate;
  },
): boolean {
  if ("journey" in condition) {
    return uiIrJourneyConditionHolds(context.journey, condition);
  }
  return "state" in condition
    ? uiIrConditionHolds(context.values, condition)
    : uiIrPlanConditionHolds(
        context.plans,
        condition,
        context.currentPlanIndex,
      );
}

export type UiIrJourneyGate = {
  isFirst: boolean;
  isLast: boolean;
  /** The chrome variant the active screen asked for, or null. */
  variant: string | null;
};

/**
 * The chrome's predicates. Outside a journey nothing is first or last and
 * there is no variant, so a condition reads as not holding — the back
 * control a chrome hides on the first screen stays hidden on a bare render.
 */
export function uiIrJourneyConditionHolds(
  journey: UiIrJourneyGate | undefined,
  condition: BuilderV2UiIrJourneyCondition,
): boolean {
  const holds =
    condition.journey === "variant"
      ? (journey?.variant ?? null) === (condition.equals ?? null)
      : (journey?.[condition.journey] ?? false);
  return condition.negate ? !holds : holds;
}
