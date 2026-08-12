import { createContext, useContext, useMemo, type ReactNode } from "react";

import {
  EMPTY_UI_IR_PLAN_SNAPSHOT,
  type UiIrPlanSnapshot,
} from "../domain/ui-ir-plans";

type UiIrPlansContextValue = {
  snapshot: UiIrPlanSnapshot;
  /** The plan a `billing-plans` repeat is currently rendering, if inside one. */
  currentIndex: number | null;
};

const UiIrPlansContext = createContext<UiIrPlansContextValue>({
  snapshot: EMPTY_UI_IR_PLAN_SNAPSHOT,
  currentIndex: null,
});

/**
 * The offering the screen's bindings read.
 *
 * A context rather than a prop threaded through every node: a price binding can
 * sit arbitrarily deep, and passing the snapshot down by hand would mean every
 * node type had to know about billing to stay out of the way.
 */
export function UiIrPlansProvider(props: {
  snapshot: UiIrPlanSnapshot;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ snapshot: props.snapshot, currentIndex: null }),
    [props.snapshot],
  );
  return (
    <UiIrPlansContext.Provider value={value}>
      {props.children}
    </UiIrPlansContext.Provider>
  );
}

/** Names which plan `{ current: true }` resolves to, inside a repeat. */
export function UiIrCurrentPlanProvider(props: {
  index: number;
  children: ReactNode;
}) {
  const outer = useContext(UiIrPlansContext);
  const value = useMemo(
    () => ({ snapshot: outer.snapshot, currentIndex: props.index }),
    [outer.snapshot, props.index],
  );
  return (
    <UiIrPlansContext.Provider value={value}>
      {props.children}
    </UiIrPlansContext.Provider>
  );
}

export function useUiIrPlans(): UiIrPlansContextValue {
  return useContext(UiIrPlansContext);
}
