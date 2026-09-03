import type { UiIrActionContext } from "../ports/ui-ir-renderer";
import {
  UiIrRuntimeCapabilityUnavailableError,
  type UiIrActionRuntimePorts,
} from "../ports/ui-ir-action-runtime";

export function createUiIrActionHandler(
  ports: UiIrActionRuntimePorts,
): (context: UiIrActionContext) => Promise<void> {
  return async (context) => {
    await trackInteraction(ports, context);
    const { action } = context;
    switch (action.type) {
      case "navigation.next":
        ports.journey.next();
        return;
      case "navigation.back":
        ports.journey.back();
        return;
      case "navigation.complete":
        ports.journey.complete();
        return;
      case "paywall.open":
        ports.journey.openPlacement(action.placement);
        return;
      case "paywall.dismiss":
        ports.journey.dismiss();
        return;
      case "billing.purchase": {
        /*
         * The artifact names a plan; only the device knows which product that
         * is. Resolving it here rather than at publish time is the whole point
         * — the offering can change without republishing the flow.
         */
        const packageId = context.resolvePurchaseTarget?.(action.source);
        if (!packageId) {
          throw new Error(
            "UI IR purchase has no product: the offering has not loaded, the paywall is showing its sample plans because none could be loaded, or the plan the screen selected is not in it.",
          );
        }
        await requiredBilling(ports).purchase({
          packageId,
          screenId: context.screenId,
          nodeId: context.nodeId,
        });
        return;
      }
      case "link.open":
        await requiredLinks(ports).open({
          url: action.url,
          screenId: context.screenId,
          nodeId: context.nodeId,
        });
        return;
      case "billing.restore":
        await requiredBilling(ports).restore({
          screenId: context.screenId,
          nodeId: context.nodeId,
        });
        return;
      case "analytics.track":
        await trackWithoutInterrupting(ports, {
          event: action.event,
          screenId: context.screenId,
          nodeId: context.nodeId,
          ...(action.properties ? { properties: action.properties } : {}),
        });
        return;
      case "capability.invoke":
        await requiredCapabilities(ports).invoke({
          capability: action.capability,
          method: action.method,
          ...(action.input !== undefined ? { input: action.input } : {}),
          screenId: context.screenId,
          nodeId: context.nodeId,
          ...(context.answers ? { answers: context.answers } : {}),
        });
        /*
         * The step after the host has answered. Reached only when the call
         * settled: a rejection above leaves the person where they were, with
         * the app's own error handling in charge.
         */
        if (action.then?.type === "navigation.next") ports.journey.next();
        else if (action.then?.type === "navigation.back") ports.journey.back();
        else if (action.then?.type === "navigation.complete") {
          ports.journey.complete();
        }
    }
  };
}

function requiredBilling(
  ports: UiIrActionRuntimePorts,
): NonNullable<UiIrActionRuntimePorts["billing"]> {
  if (!ports.billing) {
    throw new UiIrRuntimeCapabilityUnavailableError("billing");
  }
  return ports.billing;
}

function requiredLinks(
  ports: UiIrActionRuntimePorts,
): NonNullable<UiIrActionRuntimePorts["links"]> {
  if (!ports.links) {
    throw new UiIrRuntimeCapabilityUnavailableError("linking");
  }
  return ports.links;
}

function requiredCapabilities(
  ports: UiIrActionRuntimePorts,
): NonNullable<UiIrActionRuntimePorts["capabilities"]> {
  if (!ports.capabilities) {
    throw new UiIrRuntimeCapabilityUnavailableError("capability.invoke");
  }
  return ports.capabilities;
}

async function trackInteraction(
  ports: UiIrActionRuntimePorts,
  context: UiIrActionContext,
): Promise<void> {
  await trackWithoutInterrupting(ports, {
    event: "ui_interaction",
    screenId: context.screenId,
    nodeId: context.nodeId,
    properties: { actionType: context.action.type },
  });
}

async function trackWithoutInterrupting(
  ports: UiIrActionRuntimePorts,
  event: Parameters<
    NonNullable<UiIrActionRuntimePorts["analytics"]>["track"]
  >[0],
): Promise<void> {
  if (!ports.analytics) return;
  try {
    await ports.analytics.track(event);
  } catch {
    // Analytics is deliberately best-effort and cannot block the journey.
  }
}
