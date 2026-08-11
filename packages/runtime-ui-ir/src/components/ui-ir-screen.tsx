import type { ReactElement } from "react";

import {
  BuilderV2UiIrDocumentSchema,
  type BuilderV2UiIrDocument,
} from "@onborn/sdk-contracts/builder-v2-ui-ir";

import { findUiIrScreen } from "../domain/ui-ir-document";
import type { UiIrRendererPorts } from "../ports/ui-ir-renderer";
import { UiIrNode } from "./ui-ir-node";

export type UiIrScreenProps = {
  document: BuilderV2UiIrDocument;
  screenId?: string;
  locale?: string;
  ports: UiIrRendererPorts;
};

export function UiIrScreen(props: UiIrScreenProps): ReactElement {
  const document = BuilderV2UiIrDocumentSchema.parse(props.document);
  const screenId = props.screenId ?? document.entryScreenId;
  const screen = findUiIrScreen(document, screenId);
  const assets = new Map(
    document.assets.map((asset) => [asset.assetId, asset]),
  );
  return (
    <UiIrNode
      assets={assets}
      document={document}
      locale={props.locale}
      node={screen.root}
      ports={props.ports}
      screenId={screen.screenId}
    />
  );
}
