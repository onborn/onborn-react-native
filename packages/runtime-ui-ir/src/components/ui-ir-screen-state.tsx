import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { BuilderV2UiIrScreen } from "@onborn/sdk-contracts/builder-v2-ui-ir";

import type { UiIrAnswerStore } from "../domain/ui-ir-answers";
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
  const [values, setValues] = useState<UiIrStateValues>(() =>
    initialUiIrStateValues(props.screen),
  );
  const { answers, screen } = props;
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
    <UiIrScreenStateContext.Provider value={value}>
      {props.children}
    </UiIrScreenStateContext.Provider>
  );
}

export function useUiIrScreenState(): UiIrScreenStateValue {
  return useContext(UiIrScreenStateContext);
}
