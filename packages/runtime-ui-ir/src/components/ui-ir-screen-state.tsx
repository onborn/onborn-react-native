import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type { BuilderV2UiIrScreen } from "@onborn/sdk-contracts/builder-v2-ui-ir";

import type { UiIrAnswerStore, UiIrVariables } from "../domain/ui-ir-answers";
import {
  initialUiIrStateValues,
  type UiIrStateValues,
} from "../domain/ui-ir-state";

type UiIrScreenStateValue = {
  values: UiIrStateValues;
  set: (state: string, value: string | null) => void;
};

/**
 * The screen's selections, held once per screen and read wherever a condition
 * appears. A context rather than props because conditions surface at arbitrary
 * depth — a variant on a leaf twelve nodes down should not force every node in
 * between to know about state.
 */
const UiIrScreenStateContext = createContext<UiIrScreenStateValue>({
  values: {},
  set: () => undefined,
});

export function UiIrScreenStateProvider(props: {
  screen: Pick<BuilderV2UiIrScreen, "screenId" | "state">;
  children: ReactNode;
  /**
   * Where this screen's selections are published for the journey to report as
   * the screen's answer. Absent when nobody is listening, which is every
   * render path that is not a live session (previews, tests).
   */
  answers?: UiIrAnswerStore;
}) {
  const { answers, screen } = props;
  /*
   * A screen someone comes back to shows what they left on it. The state is
   * mounted fresh per screen (so one screen's selection never leaks into the
   * next), and the answer store is exactly the record of what this screen
   * held — the name typed two screens ago was gone on the way back, and a
   * quiz card lost its tick.
   */
  const [values, setValues] = useState<UiIrStateValues>(
    () => answers?.read(screen.screenId) ?? initialUiIrStateValues(screen),
  );
  useEffect(() => {
    answers?.record(screen.screenId, values);
  }, [answers, screen.screenId, values]);
  const value = useMemo<UiIrScreenStateValue>(
    () => ({
      values,
      set: (state, next) =>
        setValues((current) => ({ ...current, [state]: next })),
    }),
    [values],
  );
  return (
    <UiIrAnswersContext.Provider value={answers ?? null}>
      <UiIrScreenStateContext.Provider value={value}>
        {props.children}
      </UiIrScreenStateContext.Provider>
    </UiIrAnswersContext.Provider>
  );
}

export function useUiIrScreenState(): UiIrScreenStateValue {
  return useContext(UiIrScreenStateContext);
}

/*
 * The journey's answers, for copy that speaks them back. Held in a context of
 * its own so a text node twelve levels down can read `{{name}}` without every
 * node between knowing the store exists.
 */
const UiIrAnswersContext = createContext<UiIrAnswerStore | null>(null);

const NO_VARIABLES: UiIrVariables = Object.freeze({});
const subscribeToNothing = () => () => undefined;

/**
 * What `{{name}}` resolves to on this screen right now: everything earlier
 * screens recorded, with this screen's own live values on top — so a greeting
 * beside the field updates as the person types, not after they leave.
 */
export function useUiIrVariables(): UiIrVariables {
  const store = useContext(UiIrAnswersContext);
  const recorded = useSyncExternalStore(
    store?.subscribe ?? subscribeToNothing,
    () => store?.variables() ?? NO_VARIABLES,
    () => store?.variables() ?? NO_VARIABLES,
  );
  const { values } = useUiIrScreenState();
  return useMemo(() => {
    const merged: Record<string, string> = { ...recorded };
    for (const [name, value] of Object.entries(values)) {
      if (typeof value === "string") merged[name] = value;
    }
    return merged;
  }, [recorded, values]);
}
