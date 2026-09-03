import { useSyncExternalStore } from "react";

import {
  readUiIrPreviewMode,
  UI_IR_PREVIEW_MODE_EVENT,
} from "../domain/ui-ir-preview-mode";

/**
 * True while the builder canvas is in edit mode.
 *
 * Subscribed rather than read once: the mode flips as someone switches between
 * Edit and Live without the preview reloading, and a carousel that only looked
 * at start-up would keep advancing for the rest of the session.
 */
export function useUiIrPreviewEditing(): boolean {
  return useSyncExternalStore(subscribe, isEditing, offDevice);
}

function subscribe(onChange: () => void): () => void {
  /*
   * A device is not an editor and has no event to hear. Hermes defines
   * `window` as an alias of the global, so "is it defined" is not the test —
   * a ruler on an iPhone crashed with "undefined is not a function" on the
   * listener call. The listener itself is what has to exist.
   */
  if (
    typeof window === "undefined" ||
    typeof window.addEventListener !== "function"
  ) {
    return () => undefined;
  }
  window.addEventListener(UI_IR_PREVIEW_MODE_EVENT, onChange);
  return () => window.removeEventListener(UI_IR_PREVIEW_MODE_EVENT, onChange);
}

function isEditing(): boolean {
  return readUiIrPreviewMode() === "edit";
}

/** Server rendering and native both mean "not an editor". */
function offDevice(): boolean {
  return false;
}
