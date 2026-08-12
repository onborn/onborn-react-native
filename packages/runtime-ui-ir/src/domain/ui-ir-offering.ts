/**
 * The offering a flow sells, read from the artifact.
 *
 * The host has to load an offering before any price can render, but the choice
 * lives in the document — so the SDK asks for it once the artifact is in hand
 * and reloads if it names something other than the current offering.
 *
 * One key per flow: the document schema refuses a flow whose paywall screens
 * disagree, so the first one found is the only one there is.
 */
export function readUiIrOfferingKey(document: {
  screens: ReadonlyArray<{
    surface: string;
    billing?: { offeringKey?: string };
  }>;
}): string | undefined {
  for (const screen of document.screens) {
    if (screen.surface !== "paywall") continue;
    if (screen.billing?.offeringKey) return screen.billing.offeringKey;
  }
  return undefined;
}
