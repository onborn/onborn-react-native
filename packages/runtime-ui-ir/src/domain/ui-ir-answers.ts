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
 *
 * The same store is what a later screen's copy reads through: `{{name}}` is
 * the `name` state of whichever screen wrote it last, so the greeting two
 * screens after the name field speaks the name that was typed there.
 */
export type UiIrAnswerStore = {
  record(screenId: string, values: UiIrStateValues): void;
  read(screenId: string): UiIrStateValues | undefined;
  /** Every recorded value by state name; a later screen's write wins. */
  variables(): UiIrVariables;
  /** Fires after every record; the returned function stops it. */
  subscribe(listener: () => void): () => void;
};

export type UiIrVariables = Readonly<Record<string, string>>;

const NO_VARIABLES: UiIrVariables = Object.freeze({});

export function createUiIrAnswerStore(): UiIrAnswerStore {
  const answers = new Map<string, UiIrStateValues>();
  const listeners = new Set<() => void>();
  // Rebuilt on write, not on read: readers compare snapshots by identity.
  let variables: UiIrVariables = NO_VARIABLES;
  return {
    record(screenId, values) {
      answers.set(screenId, values);
      variables = collectVariables(answers);
      listeners.forEach((listener) => listener());
    },
    read(screenId) {
      const values = answers.get(screenId);
      // A screen with no declared state has no answer, and an empty object
      // would read as "answered nothing" rather than "was never asked".
      return values && Object.keys(values).length > 0 ? values : undefined;
    },
    variables() {
      return variables;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function collectVariables(
  answers: ReadonlyMap<string, UiIrStateValues>,
): UiIrVariables {
  const merged: Record<string, string> = {};
  for (const values of answers.values()) {
    for (const [name, value] of Object.entries(values)) {
      if (typeof value === "string") merged[name] = value;
    }
  }
  return Object.keys(merged).length > 0 ? merged : NO_VARIABLES;
}
