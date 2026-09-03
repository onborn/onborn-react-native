import type {
  BuilderV2UiIrPlanCondition,
  BuilderV2UiIrPlanField,
  BuilderV2UiIrPlanRef,
} from "@onborn/sdk-contracts/builder-v2-ui-ir";

/** One plan as the device knows it, with the store's own prices. */
export type UiIrPlan = {
  readonly id: string;
  readonly title?: string;
  readonly description?: string;
  readonly badge?: string;
  readonly price?: string;
  readonly period?: string;
  readonly trial?: string;
};

export type UiIrPlanSnapshot = {
  /**
   * `sample` is the paywall's own designed plans, shown because no offering
   * could be loaded; they draw the screen and cannot be bought.
   */
  readonly status: "loading" | "ready" | "unavailable" | "sample";
  readonly plans: readonly UiIrPlan[];
};

export const EMPTY_UI_IR_PLAN_SNAPSHOT: UiIrPlanSnapshot = {
  status: "loading",
  plans: [],
};

/**
 * Which plan a reference points at, or nothing.
 *
 * `current` is only meaningful inside a `billing-plans` repeat; outside one
 * there is no current plan, and falling back to the first would put one plan's
 * price under another plan's button.
 */
export function resolveUiIrPlan(
  snapshot: UiIrPlanSnapshot,
  reference: BuilderV2UiIrPlanRef,
  currentIndex: number | null,
): UiIrPlan | undefined {
  const index = "slot" in reference ? reference.slot : currentIndex;
  return index === null ? undefined : snapshot.plans[index];
}

/**
 * The text a binding renders — empty whenever the value is not known.
 *
 * There is deliberately no fallback anywhere in this path. A paywall showing a
 * price that is not the one the store will charge is worse than a paywall
 * showing no price, both for the person reading it and at review.
 */
export function resolveUiIrPlanField(
  snapshot: UiIrPlanSnapshot,
  reference: BuilderV2UiIrPlanRef,
  field: BuilderV2UiIrPlanField,
  currentIndex: number | null,
): string {
  const plan = resolveUiIrPlan(snapshot, reference, currentIndex);
  return plan?.[field] ?? "";
}

export function uiIrPlanConditionHolds(
  snapshot: UiIrPlanSnapshot,
  condition: BuilderV2UiIrPlanCondition,
  currentIndex: number | null,
): boolean {
  const holds = Boolean(
    resolveUiIrPlan(snapshot, condition.plan, currentIndex),
  );
  return condition.negate ? !holds : holds;
}

/** How many instances a `billing-plans` node renders. */
export function uiIrPlanCount(
  snapshot: UiIrPlanSnapshot,
  limit: number,
): number {
  return Math.min(snapshot.plans.length, limit);
}
