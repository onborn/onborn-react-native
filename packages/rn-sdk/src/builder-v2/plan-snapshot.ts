import type { UiIrPlan, UiIrPlanSnapshot } from "@onborn/runtime-ui-ir";
import type { OnbornPackageWithProduct } from "@onborn/billing";

/**
 * Turns the loaded offering into the plans a paywall's bindings read.
 *
 * Order is the offering's own: a plan slot in a published artifact is a
 * position in the list the dashboard configured, so reordering there reorders
 * the paywall without republishing the flow.
 *
 * A package whose store product has not resolved yet still becomes a plan, but
 * without a price. That is deliberate — the row can render its title and stay
 * silent about the amount, instead of the whole paywall waiting or, worse,
 * showing a number from somewhere else.
 */
export function createBuilderV2PlanSnapshot(input: {
  loading: boolean;
  packages: readonly OnbornPackageWithProduct[];
}): UiIrPlanSnapshot {
  if (input.loading) return { status: "loading", plans: [] };
  return {
    status: input.packages.length > 0 ? "ready" : "unavailable",
    plans: input.packages.map(toPlan),
  };
}

function toPlan(entry: OnbornPackageWithProduct): UiIrPlan {
  const { package: pack, product } = entry;
  return {
    id: pack.id,
    ...defined("title", pack.label ?? product?.title),
    ...defined("description", pack.description ?? product?.description),
    ...defined("badge", pack.badge),
    ...defined("price", product?.price),
    ...defined("period", formatPeriod(product)),
    ...defined("trial", product?.introOffer?.price),
  };
}

/**
 * The renewal period as a word.
 *
 * The normalized period is structured (`{ count: 1, unit: "year" }`) and the
 * raw one is a store code (`P1Y`). A paywall needs neither; it needs the word
 * next to the price, so the structured form wins and the raw string is only a
 * fallback for a store that reported nothing else.
 */
function formatPeriod(product?: {
  billingPeriod?: { count: number; unit: string } | string;
  period?: string;
}): string | undefined {
  const period = product?.billingPeriod;
  if (typeof period === "string") return period;
  if (!period) return product?.period;
  return period.count === 1 ? period.unit : `${period.count} ${period.unit}s`;
}

function defined<K extends string>(
  key: K,
  value: string | undefined,
): Record<K, string> | Record<string, never> {
  return value ? ({ [key]: value } as Record<K, string>) : {};
}
