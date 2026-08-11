import {
  BuilderV2RuntimeEventSchema,
  BuilderV2RuntimeEvent,
  type BuilderV2SignedUiIrArtifact,
  type BuilderV2UiIrDocument,
  type BuilderV2UiIrJsonValue,
  type BuilderV2UiIrRelease,
} from "@onborn/sdk-contracts";
import {
  interactionKey,
  readSignedUiIrAnalyticsContext,
  type SignedScreenContext,
  type SignedUiIrAnalyticsContext,
} from "./builder-v2-ui-ir-instrumentation";

export type BuilderV2UiIrAnalyticsInput = {
  flowId: string;
  environment: "test" | "prod";
  target: "ios" | "android";
  artifact: BuilderV2SignedUiIrArtifact;
  release: BuilderV2UiIrRelease;
  document: BuilderV2UiIrDocument;
  sessionId: string;
  emit(event: BuilderV2RuntimeEvent): void | Promise<void>;
  now?: () => Date;
};

export type BuilderV2UiIrAnalyticsEvent = {
  event: string;
  screenId?: string;
  nodeId?: string;
  properties?: Record<string, BuilderV2UiIrJsonValue>;
};

export type BuilderV2UiIrAnalyticsBridge = {
  track(event: BuilderV2UiIrAnalyticsEvent): Promise<void>;
};

export function createBuilderV2UiIrAnalyticsBridge(
  input: BuilderV2UiIrAnalyticsInput,
): BuilderV2UiIrAnalyticsBridge {
  const runtime = readSignedUiIrAnalyticsContext(input);

  return {
    async track(event) {
      const action = mapRuntimeAction(event, runtime);
      const runtimeEvent = BuilderV2RuntimeEventSchema.parse({
        schemaVersion: 1,
        action,
        flowId: input.flowId,
        flowName: runtime.flowName,
        sessionId: input.sessionId,
        environment: input.environment,
        target: input.target,
        runtimeVersion: input.artifact.manifest.runtimeVersion,
        artifactId: input.artifact.manifest.artifactId,
        releaseId: input.release.releaseId,
        occurredAt: (input.now?.() ?? new Date()).toISOString(),
        ...("screenId" in action
          ? {
              screenContext: requiredScreen(
                runtime.screens,
                action.screenId,
              ),
            }
          : {}),
      });
      await input.emit(runtimeEvent);
    },
  };
}

function mapRuntimeAction(
  event: BuilderV2UiIrAnalyticsEvent,
  runtime: SignedUiIrAnalyticsContext,
): BuilderV2RuntimeEvent["action"] {
  const { screens, nodes, interactions } = runtime;
  switch (event.event) {
    case "journey.started":
      return { type: "flow_started" };
    case "journey.completed":
      return { type: "flow_completed" };
    case "journey.dismissed":
      return { type: "flow_dismissed" };
    case "screen.viewed":
      return screenAction("screen_viewed", event, screens);
    case "screen.completed":
      return screenAction("screen_completed", event, screens);
    case "screen.returned":
      return screenAction("screen_returned", event, screens);
    case "paywall.viewed":
      return screenAction("paywall_viewed", event, screens);
    case "paywall.dismissed":
      return screenAction("paywall_dismissed", event, screens);
    case "ui_interaction":
      return interactionAction(event, screens, nodes, interactions);
    case "purchase_started":
      return paywallAction("purchase_started", event, screens);
    case "purchase_completed":
      return paywallAction("purchase_completed", event, screens);
    case "purchase_pending":
      return paywallAction("purchase_failed", event, screens, "pending");
    case "purchase_cancelled":
      return paywallAction("purchase_failed", event, screens, "cancelled");
    case "purchase_failed":
      return paywallAction(
        "purchase_failed",
        event,
        screens,
        stringProperty(event, "reason") ?? "Purchase failed",
      );
    case "restore_started":
      return screenAction("restore_started", event, screens);
    case "restore_completed":
      return screenAction("restore_completed", event, screens);
    case "restore_empty":
      return screenAction("restore_empty", event, screens);
    case "restore_failed":
      return {
        ...screenAction("restore_failed", event, screens),
        ...(stringProperty(event, "reason")
          ? { reason: stringProperty(event, "reason") }
          : {}),
      };
    default:
      return customAction(event, screens, nodes);
  }
}

function screenAction(
  type: SimpleScreenAction["type"],
  event: BuilderV2UiIrAnalyticsEvent,
  screens: Map<string, SignedScreenContext>,
): SimpleScreenAction {
  const screenId = requireScreenId(event, screens);
  return { type, screenId };
}

type SimpleScreenAction = {
  type:
    | "screen_viewed"
    | "screen_completed"
    | "screen_skipped"
    | "screen_returned"
    | "paywall_viewed"
    | "paywall_dismissed"
    | "restore_started"
    | "restore_completed"
    | "restore_empty"
    | "restore_failed";
  screenId: string;
};

function interactionAction(
  event: BuilderV2UiIrAnalyticsEvent,
  screens: Map<string, SignedScreenContext>,
  nodes: Set<string>,
  interactions: SignedUiIrAnalyticsContext["interactions"],
): BuilderV2RuntimeEvent["action"] {
  const screenId = requireScreenId(event, screens);
  const nodeId = requireNodeId(event, nodes);
  const interaction = interactions.get(interactionKey(screenId, nodeId));
  if (!interaction) {
    throw new Error(
      `UI IR analytics interaction "${screenId}/${nodeId}" is not signed.`,
    );
  }
  return {
    type: "interaction_triggered",
    screenId,
    nodeId,
    interactionId: interaction.interactionId,
    kind: interaction.kind,
  };
}

function customAction(
  event: BuilderV2UiIrAnalyticsEvent,
  screens: Map<string, SignedScreenContext>,
  nodes: Set<string>,
): BuilderV2RuntimeEvent["action"] {
  return {
    type: "custom_event",
    screenId: requireScreenId(event, screens),
    nodeId: requireNodeId(event, nodes),
    eventName: event.event,
    ...(event.properties ? { properties: event.properties } : {}),
  };
}

function paywallAction(
  type: "purchase_started" | "purchase_completed" | "purchase_failed",
  event: BuilderV2UiIrAnalyticsEvent,
  screens: Map<string, SignedScreenContext>,
  reason?: string,
): BuilderV2RuntimeEvent["action"] {
  const screenId = requireScreenId(event, screens);
  const packageId = stringProperty(event, "packageId");
  const productId = stringProperty(event, "productId");
  return {
    type,
    screenId,
    ...(packageId ? { packageId } : {}),
    ...(productId ? { productId } : {}),
    ...(reason ? { reason: reason.slice(0, 240) } : {}),
  };
}

function requireScreenId(
  event: BuilderV2UiIrAnalyticsEvent,
  screens: Map<string, SignedScreenContext>,
): string {
  if (!event.screenId || !screens.has(event.screenId)) {
    throw new Error(
      `UI IR analytics event "${event.event}" references an unsigned screen.`,
    );
  }
  return event.screenId;
}

function requireNodeId(
  event: BuilderV2UiIrAnalyticsEvent,
  nodes: Set<string>,
): string {
  if (!event.nodeId || !nodes.has(event.nodeId)) {
    throw new Error(
      `UI IR analytics event "${event.event}" references an unsigned node.`,
    );
  }
  return event.nodeId;
}

function requiredScreen(
  screens: Map<string, SignedScreenContext>,
  screenId: string,
): SignedScreenContext {
  const screen = screens.get(screenId);
  if (!screen) {
    throw new Error(`UI IR analytics screen "${screenId}" is not signed.`);
  }
  return screen;
}

function stringProperty(
  event: BuilderV2UiIrAnalyticsEvent,
  property: string,
): string | undefined {
  const value = event.properties?.[property];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
