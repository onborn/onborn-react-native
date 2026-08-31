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
  document: {
    screens: ReadonlyArray<{
      surface: string;
      placement?: string;
      standalone?: true;
      billing?: { offeringKey?: string };
    }>;
  },
  /** The standalone paywall being presented, if this is not the journey. */
  presentation?: { placement?: string },
): string | undefined {
  const presented = presentation?.placement;
  for (const screen of document.screens) {
    if (screen.surface !== "paywall") continue;
    if (presented) {
      if (screen.placement !== presented) continue;
      return screen.billing?.offeringKey;
    }
    // The journey never renders a standalone screen, so its offering is not
    // the journey's to load.
    if (screen.standalone) continue;
    if (screen.billing?.offeringKey) return screen.billing.offeringKey;
  }
  return undefined;
}
