import type { ReactElement, ReactNode } from "react";

import type {
  BuilderV2UiIrJsonValue,
  BuilderV2UiIrNode,
} from "@onborn/sdk-contracts";

export type ExpoUiIrAnalyticsEvent = {
  event: string;
  screenId?: string;
  nodeId?: string;
  properties?: Record<string, BuilderV2UiIrJsonValue>;
};

export interface ExpoUiIrAnalyticsPort {
  track(event: ExpoUiIrAnalyticsEvent): void | Promise<void>;
}

export type ExpoUiIrPurchaseResult =
  | { status: "completed"; productId: string }
  | { status: "pending"; productId?: string }
  | { status: "cancelled" };

export type ExpoUiIrRestoreResult =
  | { status: "completed"; entitlementKeys: readonly string[] }
  | { status: "empty" };

export interface ExpoUiIrBillingPort {
  purchase(input: {
    packageId: string;
    /** The paywall screen the purchase was made on, for attribution. */
    screenId: string;
  }): Promise<ExpoUiIrPurchaseResult>;
  restore(): Promise<ExpoUiIrRestoreResult>;
}

export type ExpoUiIrCapabilityInvocation = {
  capability: string;
  method: string;
  input?: BuilderV2UiIrJsonValue;
  screenId: string;
  nodeId: string;
};

export type ExpoUiIrCapabilityRender = {
  capability: string;
  component: string;
  props: BuilderV2UiIrJsonValue;
  screenId: string;
  nodeId: string;
};

export interface ExpoUiIrCapabilityPort {
  invoke(input: ExpoUiIrCapabilityInvocation): void | Promise<void>;
  render(input: ExpoUiIrCapabilityRender): ReactNode;
}

export type ExpoUiIrNodeDecorator = (input: {
  screenId: string;
  node: BuilderV2UiIrNode;
  element: ReactElement;
}) => ReactElement;
