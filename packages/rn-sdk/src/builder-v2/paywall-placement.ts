import { BuilderV2PaywallPlacementResolutionSchema } from "@onborn/sdk-contracts";

export type ResolvedBuilderV2PaywallPlacement = {
  flowId: string;
  screenId: string;
  releaseId: string;
};

/**
 * Which flow holds the paywall an app asked for by name.
 *
 * A placement is how an app names a paywall without knowing anything about the
 * flow it ships in — "settings-upsell", not "flow 7, screen 3". That indirection
 * is the whole point: the paywall can be moved, rebuilt, or replaced with a
 * different one entirely, and the call site in the app never changes.
 */
export async function resolveBuilderV2PaywallPlacement(input: {
  apiBaseUrl: string;
  apiKey: string;
  placement: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}): Promise<ResolvedBuilderV2PaywallPlacement> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = new URL(
    `/runtime/v2/paywalls/${encodeURIComponent(input.placement)}/resolve`,
    input.apiBaseUrl.endsWith("/") ? input.apiBaseUrl : `${input.apiBaseUrl}/`,
  );
  const response = await fetchImpl(url.toString(), {
    headers: { Authorization: `Bearer ${input.apiKey}` },
    ...(input.signal ? { signal: input.signal } : {}),
  });
  if (!response.ok) {
    /*
     * Said plainly, because this is the one failure an integrator causes and
     * has to fix themselves: nothing is published at that name in this
     * environment, and no retry will change that.
     */
    throw new Error(
      response.status === 404
        ? `No published paywall is registered at placement "${input.placement}".`
        : `Onborn could not resolve paywall placement "${input.placement}" (${response.status}).`,
    );
  }
  const resolution = BuilderV2PaywallPlacementResolutionSchema.safeParse(
    await response.json(),
  );
  if (!resolution.success) {
    throw new Error(
      `Onborn returned an unreadable resolution for placement "${input.placement}".`,
    );
  }
  return {
    flowId: resolution.data.flowId,
    screenId: resolution.data.screenId,
    releaseId: resolution.data.releaseId,
  };
}
