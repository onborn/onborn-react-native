import { type FlowConfig, type GetFlowResponse } from "@onborn/sdk-contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchFlow } from "../config/fetcher";
import { resolveRuntimeLocale } from "../config/locale";
import { FALLBACK_TEMPLATES, type FallbackTemplateName } from "../config/templates";
import { useOnbornRuntimeConfig } from "../config/Onborn";
import {
  defaultFlowCacheStorage,
  FlowCache,
  type FlowCacheStorage,
} from "../config/cache";

export type UseSubscriptionFlowOptions = {
  flowId: string;
  fallbackTemplate?: FallbackTemplateName;
  cacheStorage?: FlowCacheStorage;
};

export type UseSubscriptionFlowState = {
  flow: FlowConfig | null;
  paywalls: GetFlowResponse["paywalls"];
  experiment: NonNullable<GetFlowResponse["experiment"]> | null;
  loading: boolean;
  error: string | null;
  source: "network" | "cache" | "fallback" | null;
  reload: () => Promise<void>;
};

export function useSubscriptionFlow(options: UseSubscriptionFlowOptions): UseSubscriptionFlowState {
  const runtimeOptions = useOnbornRuntimeConfig(options);
  const [flow, setFlow] = useState<FlowConfig | null>(null);
  const [experiment, setExperiment] = useState<UseSubscriptionFlowState["experiment"]>(null);
  const [paywalls, setPaywalls] = useState<GetFlowResponse["paywalls"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<UseSubscriptionFlowState["source"]>(null);

  const cache = useMemo(
    () => new FlowCache(runtimeOptions.cacheStorage ?? defaultFlowCacheStorage),
    [runtimeOptions.cacheStorage],
  );
  const locale = useMemo(
    () => resolveRuntimeLocale(runtimeOptions.locale),
    [runtimeOptions.locale],
  );
  const cacheKeyLocale = useMemo(
    () =>
      [
        locale ?? "default",
        runtimeOptions.platform ?? "platform:any",
        runtimeOptions.country ?? "country:any",
        runtimeOptions.appVersion ?? "version:any",
        runtimeOptions.userType ?? "user:any",
      ].join("|"),
    [
      locale,
      runtimeOptions.appVersion,
      runtimeOptions.country,
      runtimeOptions.platform,
      runtimeOptions.userType,
    ],
  );

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    const cached = await cache.getRecord(runtimeOptions.flowId, cacheKeyLocale);
    if (cached?.hasPaywallSnapshot) {
      setFlow(cached.config);
      setPaywalls(cached.paywalls);
      setExperiment(cached.experiment);
      setSource("cache");
      setLoading(false);
    }

    try {
      const remote = await fetchFlow({
        flowId: runtimeOptions.flowId,
        apiKey: runtimeOptions.apiKey,
        userId: runtimeOptions.userId,
        locale,
        platform: runtimeOptions.platform,
        country: runtimeOptions.country,
        appVersion: runtimeOptions.appVersion,
        userType: runtimeOptions.userType,
        fetchImpl: runtimeOptions.fetchImpl,
      });
      setFlow(remote.config);
      setPaywalls(remote.paywalls ?? []);
      setExperiment(remote.experiment ?? null);
      setSource("network");
      await cache.setResponse(remote, cacheKeyLocale);
      return;
    } catch (networkError) {
      if (cached) {
        setFlow(cached.config);
        setPaywalls(cached.paywalls);
        setExperiment(cached.experiment);
        setSource("cache");
        setError(`Loaded from cache after network failure: ${toErrorMessage(networkError)}`);
        setLoading(false);
        return;
      }

      if (runtimeOptions.fallbackTemplate) {
        const fallback = FALLBACK_TEMPLATES[runtimeOptions.fallbackTemplate];
        if (fallback) {
          setFlow(fallback);
          setPaywalls([]);
          setExperiment(null);
          setSource("fallback");
          setError(`Loaded fallback template after network failure: ${toErrorMessage(networkError)}`);
          setLoading(false);
          return;
        }
      }

      setError(toErrorMessage(networkError));
    } finally {
      setLoading(false);
    }
  }, [
    cache,
    cacheKeyLocale,
    runtimeOptions.apiKey,
    runtimeOptions.appVersion,
    runtimeOptions.country,
    runtimeOptions.fallbackTemplate,
    runtimeOptions.fetchImpl,
    runtimeOptions.flowId,
    runtimeOptions.platform,
    runtimeOptions.userId,
    runtimeOptions.userType,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    flow,
    paywalls,
    experiment,
    loading,
    error,
    source,
    reload: load,
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}
