import type { ReactElement } from "react";

import { UiIrJourney } from "@onborn/runtime-ui-ir/react";

import type { ExpoUiIrRuntimeSession } from "../application/create-expo-ui-ir-runtime-session";

export type ExpoUiIrFlowProps = {
  session: ExpoUiIrRuntimeSession;
  locale?: string;
};

export function ExpoUiIrFlow(props: ExpoUiIrFlowProps): ReactElement {
  return (
    <UiIrJourney
      document={props.session.document}
      locale={props.locale}
      controller={props.session.controller}
      actionPorts={props.session.actionPorts}
      rendererPorts={props.session.rendererPorts}
    />
  );
}
