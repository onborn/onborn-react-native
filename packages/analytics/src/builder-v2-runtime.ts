import type {
  BuilderV2RuntimeEvent,
  BuilderV2RuntimeSemanticAction,
} from "@onborn/sdk-contracts/builder-v2-runtime-events";
import type { OnbornTrackEventInput } from "./client";

const BUILDER_V2_PAYWALL_TEMPLATE = "builder_v2_dynamic_ui";
const BUILDER_V2_STEP_TYPE = "builder_v2";

export type BuilderV2MappedAnalyticsEvent = {
  input: OnbornTrackEventInput;
  timestamp: number;
};

export class BuilderV2RuntimeEventMapper {
  private readonly flowStartedAt = new Map<string, number>();
  private readonly screenViewedAt = new Map<string, number>();
  private readonly completedScreens = new Map<string, Set<string>>();

  map(event: BuilderV2RuntimeEvent): BuilderV2MappedAnalyticsEvent {
    const timestamp = Date.parse(event.occurredAt);
    if (!Number.isFinite(timestamp)) {
      throw new Error("Builder V2 runtime event has an invalid timestamp.");
    }

    const common = {
      flowId: event.flowId,
      flowName: event.flowName,
      sessionId: event.sessionId,
      runtimeSource: "builder_v2" as const,
      runtimeVersion: event.runtimeVersion,
      runtimeTarget: event.target,
      artifactId: event.artifactId,
      releaseId: event.releaseId,
      ...(event.experiment
        ? {
            experimentId: event.experiment.id,
            experimentVariantId: event.experiment.variantId,
            experimentAssignmentId: event.experiment.assignmentId,
          }
        : {}),
    };
    const action = event.action;

    if (action.type === "flow_started") {
      this.flowStartedAt.set(event.sessionId, timestamp);
      this.completedScreens.set(event.sessionId, new Set());
      return mapped({ ...common, type: "flow_started" }, timestamp);
    }
    if (action.type === "flow_resumed") {
      this.flowStartedAt.set(event.sessionId, timestamp);
      this.completedScreens.set(event.sessionId, new Set());
      return mapped({ ...common, type: "flow_resumed" }, timestamp);
    }

    const screenContext =
      "screenContext" in event ? event.screenContext : undefined;
    const screen =
      "screenId" in action && screenContext
        ? {
            stepId: action.screenId,
            stepIndex: screenContext.position,
            stepType:
              screenContext.surface === "paywall"
                ? "paywall"
                : BUILDER_V2_STEP_TYPE,
          }
        : null;

    switch (action.type) {
      case "screen_viewed": {
        const requiredScreen = requireScreen(screen, action);
        this.screenViewedAt.set(
          screenKey(event.sessionId, action.screenId),
          timestamp,
        );
        return mapped(
          { ...common, ...requiredScreen, type: "step_viewed" },
          timestamp,
        );
      }
      case "screen_completed": {
        const requiredScreen = requireScreen(screen, action);
        this.completed(event.sessionId).add(action.screenId);
        return mapped(
          {
            ...common,
            ...requiredScreen,
            type: "step_completed",
            timeSpentMs: elapsed(
              this.screenViewedAt.get(
                screenKey(event.sessionId, action.screenId),
              ),
              timestamp,
            ),
            // The screen's selections are this step's answer. Reported under
            // the field the dashboard already reads, so answer distribution and
            // experiment answer breakdowns work without a second pipeline.
            ...(action.answers ? { answer: action.answers } : {}),
          },
          timestamp,
        );
      }
      case "screen_skipped": {
        const requiredScreen = requireScreen(screen, action);
        return mapped(
          {
            ...common,
            type: "step_skipped",
            stepId: requiredScreen.stepId,
            stepIndex: requiredScreen.stepIndex,
          },
          timestamp,
        );
      }
      case "screen_returned": {
        const requiredScreen = requireScreen(screen, action);
        this.screenViewedAt.set(
          screenKey(event.sessionId, action.screenId),
          timestamp,
        );
        return mapped(
          { ...common, ...requiredScreen, type: "step_returned" },
          timestamp,
        );
      }
      case "interaction_triggered": {
        const requiredScreen = requireScreen(screen, action);
        return mapped(
          {
            ...common,
            ...requiredScreen,
            type: "runtime_interaction_triggered",
            nodeId: action.nodeId,
            interactionId: action.interactionId,
            interactionKind: action.kind,
          },
          timestamp,
        );
      }
      case "custom_event": {
        const requiredScreen = requireScreen(screen, action);
        return mapped(
          {
            ...common,
            ...requiredScreen,
            type: "runtime_custom_event",
            nodeId: action.nodeId,
            eventName: action.eventName,
            ...(action.properties ? { properties: action.properties } : {}),
          },
          timestamp,
        );
      }
      case "experiment_exposed": {
        if (!event.experiment) {
          throw new Error(
            "Builder V2 experiment exposure requires an assignment.",
          );
        }
        return mapped(
          {
            ...common,
            type: "experiment_exposed",
            experimentId: event.experiment.id,
            experimentVariantId: event.experiment.variantId,
          },
          timestamp,
        );
      }
      case "flow_completed":
        return mapped(
          {
            ...common,
            type: "flow_completed",
            totalTimeMs: elapsed(
              this.flowStartedAt.get(event.sessionId),
              timestamp,
            ),
            stepsCompleted: this.completed(event.sessionId).size,
          },
          timestamp,
        );
      case "flow_skipped":
        return mapped(
          {
            ...common,
            type: "flow_skipped",
            stepsCompleted: this.completed(event.sessionId).size,
          },
          timestamp,
        );
      case "flow_dismissed":
        return mapped(
          {
            ...common,
            type: "flow_dismissed",
            stepsCompleted: this.completed(event.sessionId).size,
          },
          timestamp,
        );
      case "paywall_viewed": {
        const requiredScreen = requireScreen(screen, action);
        this.screenViewedAt.set(
          screenKey(event.sessionId, action.screenId),
          timestamp,
        );
        return mapped(
          paywallFields(common, requiredScreen.stepId, "paywall_viewed"),
          timestamp,
        );
      }
      case "paywall_dismissed": {
        const requiredScreen = requireScreen(screen, action);
        return mapped(
          {
            ...paywallFields(
              common,
              requiredScreen.stepId,
              "paywall_dismissed",
            ),
            timeSpentMs: elapsed(
              this.screenViewedAt.get(
                screenKey(event.sessionId, action.screenId),
              ),
              timestamp,
            ),
          },
          timestamp,
        );
      }
      case "purchase_started": {
        const requiredScreen = requireScreen(screen, action);
        return mapped(
          {
            ...paywallFields(
              common,
              requiredScreen.stepId,
              "paywall_purchase_started",
            ),
            packageId: action.packageId,
            productId: action.productId,
          },
          timestamp,
        );
      }
      case "purchase_completed": {
        const requiredScreen = requireScreen(screen, action);
        if (!action.productId) {
          throw new Error(
            "Builder V2 completed purchase event requires a product ID.",
          );
        }
        return mapped(
          {
            ...paywallFields(
              common,
              requiredScreen.stepId,
              "paywall_converted",
            ),
            productId: action.productId,
          },
          timestamp,
        );
      }
      case "purchase_failed": {
        const requiredScreen = requireScreen(screen, action);
        return mapped(
          {
            ...paywallFields(
              common,
              requiredScreen.stepId,
              "paywall_purchase_failed",
            ),
            reason: purchaseFailureReason(action.reason),
            message: action.reason,
            packageId: action.packageId,
            productId: action.productId,
          },
          timestamp,
        );
      }
      case "restore_started": {
        const requiredScreen = requireScreen(screen, action);
        return mapped(
          paywallFields(
            common,
            requiredScreen.stepId,
            "paywall_restore_started",
          ),
          timestamp,
        );
      }
      case "restore_completed":
      case "restore_empty": {
        const requiredScreen = requireScreen(screen, action);
        return mapped(
          {
            ...paywallFields(
              common,
              requiredScreen.stepId,
              "paywall_restore_completed",
            ),
            restored: action.type === "restore_completed",
          },
          timestamp,
        );
      }
      case "restore_failed": {
        const requiredScreen = requireScreen(screen, action);
        return mapped(
          {
            ...paywallFields(
              common,
              requiredScreen.stepId,
              "paywall_restore_failed",
            ),
            message: action.reason,
          },
          timestamp,
        );
      }
    }
  }

  reset(): void {
    this.flowStartedAt.clear();
    this.screenViewedAt.clear();
    this.completedScreens.clear();
  }

  private completed(sessionId: string): Set<string> {
    const existing = this.completedScreens.get(sessionId);
    if (existing) return existing;
    const created = new Set<string>();
    this.completedScreens.set(sessionId, created);
    return created;
  }
}

function mapped(
  input: OnbornTrackEventInput,
  timestamp: number,
): BuilderV2MappedAnalyticsEvent {
  return { input, timestamp };
}

function requireScreen(
  screen: {
    stepId: string;
    stepIndex: number;
    stepType: string;
  } | null,
  action: BuilderV2RuntimeSemanticAction,
) {
  if (!screen) {
    throw new Error(
      `Builder V2 runtime action "${action.type}" is missing signed screen context.`,
    );
  }
  return screen;
}

function paywallFields<
  T extends
    | "paywall_viewed"
    | "paywall_dismissed"
    | "paywall_purchase_started"
    | "paywall_purchase_failed"
    | "paywall_converted"
    | "paywall_restore_started"
    | "paywall_restore_completed"
    | "paywall_restore_failed",
>(
  common: {
    flowId: string;
    flowName: string;
    sessionId: string;
    runtimeSource: "builder_v2";
    runtimeVersion: string;
    runtimeTarget: "ios" | "android" | "web";
    artifactId: string;
    releaseId: string;
    experimentId?: string;
    experimentVariantId?: string;
    experimentAssignmentId?: string;
  },
  screenId: string,
  type: T,
) {
  return {
    ...common,
    type,
    stepId: screenId,
    paywallId: screenId,
    paywallTemplate: BUILDER_V2_PAYWALL_TEMPLATE,
  };
}

function screenKey(sessionId: string, screenId: string): string {
  return `${sessionId}:${screenId}`;
}

function elapsed(startedAt: number | undefined, finishedAt: number): number {
  return startedAt === undefined ? 0 : Math.max(0, finishedAt - startedAt);
}

function isCancelled(reason: string | undefined): boolean {
  return /cancel(?:led|ed|ation)?/i.test(reason ?? "");
}

function purchaseFailureReason(
  reason: string | undefined,
): "cancelled" | "error" | "pending" {
  if (reason === "pending") return "pending";
  return isCancelled(reason) ? "cancelled" : "error";
}
