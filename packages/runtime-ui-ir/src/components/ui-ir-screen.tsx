import type { ReactElement } from "react";

import {
  BuilderV2UiIrDocumentSchema,
  type BuilderV2UiIrDocument,
} from "@onborn/sdk-contracts/builder-v2-ui-ir";

import { findUiIrScreen } from "../domain/ui-ir-document";
import {
  EMPTY_UI_IR_PLAN_SNAPSHOT,
  type UiIrPlanSnapshot,
} from "../domain/ui-ir-plans";
import type { UiIrRendererPorts } from "../ports/ui-ir-renderer";
import { UiIrNode } from "./ui-ir-node";
import { UiIrPlansProvider } from "./ui-ir-plans-context";
import { UiIrScreenStateProvider } from "./ui-ir-screen-state";

export type UiIrScreenProps = {
  document: BuilderV2UiIrDocument;
  screenId?: string;
  locale?: string;
  ports: UiIrRendererPorts;
  /**
   * The offering this screen's price bindings read. Absent on a screen that
   * asks for no money, and while the store is still loading — in which case
   * every binding renders empty rather than a number nobody has confirmed.
   */
  plans?: UiIrPlanSnapshot;
};

export function UiIrScreen(props: UiIrScreenProps): ReactElement {
  const document = BuilderV2UiIrDocumentSchema.parse(props.document);
  const screenId = props.screenId ?? document.entryScreenId;
  const screen = findUiIrScreen(document, screenId);
  const assets = new Map(
    document.assets.map((asset) => [asset.assetId, asset]),
  );
  return (
    // Keyed by screen, so navigating resets selections instead of leaking one
    // screen's answer into the next.
    <UiIrScreenStateProvider key={screen.screenId} screen={screen}>
      <UiIrPlansProvider snapshot={props.plans ?? EMPTY_UI_IR_PLAN_SNAPSHOT}>
        <UiIrNode
          assets={assets}
          document={document}
          locale={props.locale}
          node={screen.root}
          ports={props.ports}
          screenId={screen.screenId}
        />
      </UiIrPlansProvider>
    </UiIrScreenStateProvider>
  );
}
