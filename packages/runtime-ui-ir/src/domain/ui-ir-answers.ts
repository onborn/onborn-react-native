import type { UiIrStateValues } from "./ui-ir-state";

/**
 * The selections each screen holds right now.
 *
 * The journey controller decides when a screen is finished, but the selections
 * live in the rendered screen. Rather than lifting screen state into the
 * controller (and re-rendering the whole journey on every tap), the screen
 * writes its current values here and the controller reads them at the moment it
 * reports the screen as completed.
 *
 * Answers are kept per screen and overwritten in place, so going back and
 * changing one reports the value the user actually left behind.
 */
export type UiIrAnswerStore = {
  record(screenId: string, values: UiIrStateValues): void;
  read(screenId: string): UiIrStateValues | undefined;
};

export function createUiIrAnswerStore(): UiIrAnswerStore {
  const answers = new Map<string, UiIrStateValues>();
  return {
    record(screenId, values) {
      answers.set(screenId, values);
    },
    read(screenId) {
      const values = answers.get(screenId);
      // A screen with no declared state has no answer, and an empty object
      // would read as "answered nothing" rather than "was never asked".
      return values && Object.keys(values).length > 0 ? values : undefined;
    },
  };
}
