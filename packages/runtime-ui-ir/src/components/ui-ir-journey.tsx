import { useEffect, useMemo, useState, type ReactElement } from "react";

import type { BuilderV2UiIrDocument } from "@onborn/sdk-contracts";

import { createUiIrActionHandler } from "../application/create-ui-ir-action-handler";
import type {
  UiIrJourneyController,
  UiIrJourneyState,
} from "../domain/ui-ir-journey";
import type { UiIrActionRuntimePorts } from "../ports/ui-ir-action-runtime";
import type { UiIrRendererPorts } from "../ports/ui-ir-renderer";
import type { UiIrPlanSnapshot } from "../domain/ui-ir-plans";
import { UiIrScreen } from "./ui-ir-screen";

export type UiIrJourneyProps = {
  document: BuilderV2UiIrDocument;
  locale?: string;
  controller: UiIrJourneyController;
  actionPorts: Omit<UiIrActionRuntimePorts, "journey">;
  rendererPorts: Omit<UiIrRendererPorts, "handleAction">;
  /** The offering a paywall screen's price bindings read. */
  plans?: UiIrPlanSnapshot;
};

export function UiIrJourney(props: UiIrJourneyProps): ReactElement {
  const [journey, setJourney] = useState<UiIrJourneyState>(() =>
    props.controller.getState(),
  );
  const handleAction = useMemo(
    () =>
      createUiIrActionHandler({
        ...props.actionPorts,
        journey: props.controller,
      }),
    [props.actionPorts, props.controller],
  );
  const rendererPorts = useMemo<UiIrRendererPorts>(
    () => ({ ...props.rendererPorts, handleAction }),
    [handleAction, props.rendererPorts],
  );

  useEffect(() => {
    const unsubscribe = props.controller.subscribe(setJourney);
    props.controller.start();
    return unsubscribe;
  }, [props.controller]);

  return (
    <UiIrScreen
      document={props.document}
      locale={props.locale}
      plans={props.plans}
      ports={rendererPorts}
      screenId={journey.activeScreenId}
    />
  );
}
