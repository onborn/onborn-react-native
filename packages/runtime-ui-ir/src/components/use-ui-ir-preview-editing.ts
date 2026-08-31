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
  if (typeof window === "undefined") return () => undefined;
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
