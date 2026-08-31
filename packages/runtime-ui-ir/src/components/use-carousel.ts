import { advanceAnyCarousel } from "./ui-ir-carousel-advance";

/**
 * `const carousel = useCarousel()` — the screen-side handle for a Continue
 * button that pages the carousel before it navigates.
 *
 * `carousel.advance(atEnd)` moves the mounted carousel one page forward; when
 * it is already on its last page, `atEnd` runs instead — which is where the
 * navigation the journey expects from the final slide belongs:
 * `onPress={() => carousel.advance(() => runtime.navigation.continue())}`.
 *
 * The same call the published document compiles to (`carousel.advance` with
 * its at-end action), so authoring and artifact behave identically.
 */
export function useCarousel(): {
  advance: (atEnd?: () => void) => void;
} {
  return {
    advance: (atEnd) => {
      if (!advanceAnyCarousel()) atEnd?.();
    },
  };
}
