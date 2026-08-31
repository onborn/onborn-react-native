/**
 * The bridge between a Continue button and the pager it advances.
 *
 * The button lives outside the carousel — the reference composition puts it in
 * the action block at the bottom of the screen — so the press cannot reach the
 * strip through props without threading a handle across the whole tree. A
 * module registry keeps the wiring invisible: each mounted carousel registers
 * an advance function, a press asks the most recently mounted one to move, and
 * a carousel already on its last page answers false — which is the caller's
 * cue to run the action the journey actually wants from the final slide.
 *
 * A module singleton is enough because the journey shows one screen at a time
 * and unmounts the rest; the newest registration wins in the rare overlap.
 */
const advances: Array<() => boolean> = [];

export function registerCarouselAdvance(advance: () => boolean): () => void {
  advances.push(advance);
  return () => {
    const at = advances.indexOf(advance);
    if (at !== -1) advances.splice(at, 1);
  };
}

/** True when some mounted carousel moved a page; false means "at the end". */
export function advanceAnyCarousel(): boolean {
  for (let index = advances.length - 1; index >= 0; index -= 1) {
    if (advances[index]!()) return true;
  }
  return false;
}
