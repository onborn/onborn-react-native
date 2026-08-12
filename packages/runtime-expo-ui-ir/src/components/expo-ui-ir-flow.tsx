import type { ReactElement } from "react";

import { UiIrJourney } from "@onborn/runtime-ui-ir/react";
import type { UiIrPlanSnapshot } from "@onborn/runtime-ui-ir";

import type { ExpoUiIrRuntimeSession } from "../application/create-expo-ui-ir-runtime-session";

export type ExpoUiIrFlowProps = {
  session: ExpoUiIrRuntimeSession;
  locale?: string;
  /** The offering a paywall screen's price bindings read. */
  plans?: UiIrPlanSnapshot;
};

export function ExpoUiIrFlow(props: ExpoUiIrFlowProps): ReactElement {
  return (
    <UiIrJourney
      document={props.session.document}
      locale={props.locale}
      controller={props.session.controller}
      actionPorts={props.session.actionPorts}
      plans={props.plans}
      rendererPorts={props.session.rendererPorts}
    />
  );
}
