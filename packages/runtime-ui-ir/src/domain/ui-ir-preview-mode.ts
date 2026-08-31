/**
 * Whether a rendered screen is being edited rather than used.
 *
 * The builder's canvas runs the real components, so a carousel that advances
 * itself advanced while someone was trying to restyle the slide under it — the
 * page moved out from under the click. Motion that is right on a device is
 * wrong in an editor, and only the editor knows which it is.
 *
 * Carried on a global rather than a prop or a context: the preview host is
 * generated code that wraps the project's own `App`, and nothing in between is
 * ours to thread a value through.
 */
export const UI_IR_PREVIEW_MODE_EVENT = "onborn:preview-interaction-mode";

export type UiIrPreviewMode = "edit" | "live";

export function readUiIrPreviewMode(
  scope: Record<string, unknown> = globalThis as unknown as Record<
    string,
    unknown
  >,
): UiIrPreviewMode | null {
  const mode = scope.__onbornPreviewInteractionMode;
  if (mode === "edit" || mode === "live") return mode;
  // A device has no editor, so the absence of the flag is not "unknown" — it
  // is the ordinary case, and it must behave exactly as it always has.
  return null;
}
