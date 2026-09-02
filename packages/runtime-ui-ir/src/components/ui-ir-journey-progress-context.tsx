import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";

import type { UiIrJourneyGate } from "../domain/ui-ir-state";

export type UiIrJourneyContextValue = {
  position: number | null;
  total: number | null;
  /** The predicates the chrome gates on; null outside a journey. */
  gate: UiIrJourneyGate | null;
  /**
   * The last fraction any bar drew, kept across screens. Screens mount fresh,
   * so a bar's animation from the previous step has to be remembered
   * somewhere that outlives the screen — the journey.
   */
  remembered: MutableRefObject<number | null>;
};

const UiIrJourneyContext = createContext<UiIrJourneyContextValue>({
  position: null,
  total: null,
  gate: null,
  remembered: { current: null },
});

/**
 * Where the journey stands, for everything that reads it: a progress bar,
 * a chrome hiding its back control on the first screen, a variant-gated
 * header. One provider around chrome and screen alike.
 */
export function UiIrJourneyProvider(props: {
  position: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
  variant: string | null;
  children: ReactNode;
}) {
  const remembered = useRef<number | null>(null);
  const value = useMemo<UiIrJourneyContextValue>(
    () => ({
      position: props.position,
      total: props.total,
      gate: { isFirst: props.isFirst, isLast: props.isLast, variant: props.variant },
      remembered,
    }),
    [props.position, props.total, props.isFirst, props.isLast, props.variant],
  );
  return (
    <UiIrJourneyContext.Provider value={value}>
      {props.children}
    </UiIrJourneyContext.Provider>
  );
}

export function useUiIrJourneyProgressContext(): UiIrJourneyContextValue {
  return useContext(UiIrJourneyContext);
}
