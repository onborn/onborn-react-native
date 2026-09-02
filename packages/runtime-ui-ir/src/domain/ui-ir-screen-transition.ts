import type {
  BuilderV2UiIrDocument,
  BuilderV2UiIrEnterTransition,
  BuilderV2UiIrScreen,
  BuilderV2UiIrScreenTransition,
} from "@onborn/sdk-contracts/builder-v2-ui-ir";

export type UiIrJourneyDirection = "forward" | "back";

/*
 * The runtime's own default: a step rises in from a little below. Reanimated
 * names presets by where the element moves, so the one that starts 25pt
 * below is FadeInDown.
 */
const DEFAULT_TRANSITION: BuilderV2UiIrScreenTransition = {
  kind: "fade-up",
  durationMs: 280,
};

/**
 * The entrance a screen plays when the journey moves to it.
 *
 * The screen's own transition wins over the flow's, which wins over the
 * runtime's default. The direction decides the shape: forward rises or
 * slides in from the right, back fades or slides in from the left — so
 * "back" reads as going back, not as another step forward. The first screen
 * plays nothing; it arrives with the host.
 */
export function uiIrScreenEnterTransition(input: {
  document: Pick<BuilderV2UiIrDocument, "transitions">;
  screen: Pick<BuilderV2UiIrScreen, "transition">;
  direction: UiIrJourneyDirection;
}): BuilderV2UiIrEnterTransition | null {
  const declared =
    input.screen.transition ??
    input.document.transitions?.screen ??
    DEFAULT_TRANSITION;
  const durationMs = declared.durationMs ?? DEFAULT_TRANSITION.durationMs!;
  const back = input.direction === "back";
  switch (declared.kind) {
    case "none":
      return null;
    case "fade":
      return { type: "reanimated", preset: "FadeIn", durationMs };
    case "slide":
      return {
        type: "reanimated",
        preset: back ? "SlideInLeft" : "SlideInRight",
        durationMs,
      };
    case "fade-up":
      return {
        type: "reanimated",
        preset: back ? "FadeIn" : "FadeInDown",
        durationMs,
      };
  }
}
