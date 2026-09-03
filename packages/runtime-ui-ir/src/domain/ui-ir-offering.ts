import type { UiIrPlan, UiIrPlanSnapshot } from "./ui-ir-plans";

/**
 * The offering a presentation sells, read from the artifact.
 *
 * The host has to load an offering before any price can render, but the choice
 * lives in the document — so the SDK asks for it once the artifact is in hand
 * and reloads if it names something other than the current offering.
 *
 * One key per presentation, not per document. The journey is one presentation
 * however many paywalls it contains, and the schema refuses a journey whose
 * paywalls disagree. A standalone paywall is opened on its own, so it may name
 * an offering of its own — a win-back screen selling a discounted offering
 * cannot change what the onboarding's paywall charges, because the two are
 * never on screen in the same session.
 */
export function readUiIrOfferingKey(
  document: UiIrOfferingDocument,
  /** The standalone paywall being presented, if this is not the journey. */
  presentation?: { placement?: string },
): string | undefined {
  return presentedPaywall(document, presentation, (screen) =>
    screen.billing?.offeringKey,
  );
}

type UiIrOfferingScreen = {
  surface: string;
  placement?: string;
  standalone?: true;
  billing?: {
    offeringKey?: string;
    samplePlans?: ReadonlyArray<UiIrPlanSample>;
  };
};

type UiIrOfferingDocument = { screens: ReadonlyArray<UiIrOfferingScreen> };

type UiIrPlanSample = {
  title: string;
  price: string;
  period?: string;
  trial?: string;
  badge?: string;
  description?: string;
};

/**
 * The paywall a presentation shows, read for one value: the standalone
 * screen at the placement, or the journey's first paywall that has it.
 */
function presentedPaywall<T>(
  document: UiIrOfferingDocument,
  presentation: { placement?: string } | undefined,
  read: (screen: UiIrOfferingScreen) => T | undefined,
): T | undefined {
  const presented = presentation?.placement;
  for (const screen of document.screens) {
    if (screen.surface !== "paywall") continue;
    if (presented) {
      if (screen.placement !== presented) continue;
      return read(screen);
    }
    // The journey never renders a standalone screen, so its offering is not
    // the journey's to load.
    if (screen.standalone) continue;
    const value = read(screen);
    if (value !== undefined) return value;
  }
  return undefined;
}

/**
 * The plans the presented paywall was designed around, as the snapshot a
 * paywall's bindings read — or nothing, for a screen that designed none.
 *
 * Ids are positional and unlike any package id, so a purchase button that
 * resolves one is refused by the same path that refuses an unloaded plan.
 */
export function readUiIrSamplePlans(
  document: UiIrOfferingDocument,
  presentation?: { placement?: string },
): readonly UiIrPlan[] | undefined {
  const samples = presentedPaywall(document, presentation, (screen) =>
    screen.billing?.samplePlans?.length ? screen.billing.samplePlans : undefined,
  );
  return samples?.map((sample, index) => ({
    id: `sample-${index}`,
    title: sample.title,
    price: sample.price,
    ...(sample.period ? { period: sample.period } : {}),
    ...(sample.trial ? { trial: sample.trial } : {}),
    ...(sample.badge ? { badge: sample.badge } : {}),
    ...(sample.description ? { description: sample.description } : {}),
  }));
}

/**
 * The snapshot a paywall renders when the offering cannot be loaded.
 *
 * Only `unavailable` falls back — the request failed, or the project sells
 * nothing — so a loading offering keeps its blank rows rather than flashing
 * samples before the store answers, and a loaded one is never second-guessed:
 * a paywall showing a price the store will not charge is the failure the
 * bindings exist to prevent. What the fallback shows is the composition the
 * author designed, with prices marked as samples by their status, and a
 * purchase from it is refused.
 */
export function withUiIrSamplePlans(
  snapshot: UiIrPlanSnapshot,
  samples: readonly UiIrPlan[] | undefined,
): UiIrPlanSnapshot {
  if (snapshot.status !== "unavailable" || !samples?.length) return snapshot;
  return { status: "sample", plans: samples };
}
