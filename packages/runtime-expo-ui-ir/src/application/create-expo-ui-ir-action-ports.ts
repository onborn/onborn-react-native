import type { UiIrActionRuntimePorts } from "@onborn/runtime-ui-ir/actions";

import type {
  ExpoUiIrAnalyticsPort,
  ExpoUiIrBillingPort,
  ExpoUiIrCapabilityPort,
} from "../ports/expo-ui-ir-runtime";

type ActionPorts = Omit<UiIrActionRuntimePorts, "journey">;

export function createExpoUiIrActionPorts(input: {
  analytics?: ExpoUiIrAnalyticsPort;
  billing?: ExpoUiIrBillingPort;
  capabilities?: ExpoUiIrCapabilityPort;
}): ActionPorts {
  return {
    ...(input.analytics ? { analytics: input.analytics } : {}),
    ...(input.billing
      ? { billing: createBillingActions(input.billing, input.analytics) }
      : {}),
    ...(input.capabilities
      ? {
          capabilities: {
            invoke: (invocation) => input.capabilities!.invoke(invocation),
          },
        }
      : {}),
  };
}

function createBillingActions(
  billing: ExpoUiIrBillingPort,
  analytics?: ExpoUiIrAnalyticsPort,
): NonNullable<ActionPorts["billing"]> {
  return {
    async purchase(input) {
      await track(analytics, {
        event: "purchase_started",
        screenId: input.screenId,
        nodeId: input.nodeId,
        properties: { packageId: input.packageId },
      });
      try {
        const result = await billing.purchase({
          packageId: input.packageId,
        });
        await track(analytics, {
          event: purchaseEvent(result.status),
          screenId: input.screenId,
          nodeId: input.nodeId,
          properties: {
            packageId: input.packageId,
            ...("productId" in result && result.productId
              ? { productId: result.productId }
              : {}),
          },
        });
      } catch (error) {
        await track(analytics, {
          event: "purchase_failed",
          screenId: input.screenId,
          nodeId: input.nodeId,
          properties: {
            packageId: input.packageId,
            reason: errorMessage(error),
          },
        });
        throw error;
      }
    },
    async restore(input) {
      await track(analytics, {
        event: "restore_started",
        screenId: input.screenId,
        nodeId: input.nodeId,
      });
      try {
        const result = await billing.restore();
        await track(analytics, {
          event:
            result.status === "completed"
              ? "restore_completed"
              : "restore_empty",
          screenId: input.screenId,
          nodeId: input.nodeId,
          ...(result.status === "completed"
            ? {
                properties: {
                  entitlementKeys: [...result.entitlementKeys],
                },
              }
            : {}),
        });
      } catch (error) {
        await track(analytics, {
          event: "restore_failed",
          screenId: input.screenId,
          nodeId: input.nodeId,
          properties: { reason: errorMessage(error) },
        });
        throw error;
      }
    },
  };
}

function purchaseEvent(
  status: "completed" | "pending" | "cancelled",
): string {
  if (status === "completed") return "purchase_completed";
  if (status === "pending") return "purchase_pending";
  return "purchase_cancelled";
}

async function track(
  analytics: ExpoUiIrAnalyticsPort | undefined,
  event: Parameters<ExpoUiIrAnalyticsPort["track"]>[0],
): Promise<void> {
  if (!analytics) return;
  try {
    await analytics.track(event);
  } catch {
    // Analytics must never turn a completed native action into a failure.
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown billing error";
}
