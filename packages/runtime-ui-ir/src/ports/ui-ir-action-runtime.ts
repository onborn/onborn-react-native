import type { BuilderV2UiIrJsonValue } from "@onborn/sdk-contracts";

import type { UiIrJourneyController } from "../domain/ui-ir-journey";

export type UiIrActionAnalyticsEvent = {
  event: string;
  screenId: string;
  nodeId?: string;
  properties?: Record<string, BuilderV2UiIrJsonValue>;
};

export type UiIrActionRuntimePorts = {
  journey: UiIrJourneyController;
  analytics?: {
    track(event: UiIrActionAnalyticsEvent): void | Promise<void>;
  };
  billing?: {
    purchase(input: {
      packageId: string;
      screenId: string;
      nodeId: string;
    }): void | Promise<void>;
    restore(input: {
      screenId: string;
      nodeId: string;
    }): void | Promise<void>;
  };
  capabilities?: {
    invoke(input: {
      capability: string;
      method: string;
      input?: BuilderV2UiIrJsonValue;
      screenId: string;
      nodeId: string;
    }): void | Promise<void>;
  };
};

export class UiIrRuntimeCapabilityUnavailableError extends Error {
  constructor(capability: string) {
    super(`UI IR runtime capability "${capability}" is unavailable.`);
    this.name = "UiIrRuntimeCapabilityUnavailableError";
  }
}
