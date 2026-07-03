import { type FlowConfig, type GetFlowResponse } from "@onborn/sdk-contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchFlow } from "../config/fetcher";
import { resolveRuntimeLocale } from "../config/locale";
import { FALLBACK_TEMPLATES, type FallbackTemplateName } from "../config/templates";
import {
  defaultFlowCacheStorage,
  FlowCache,
  type FlowCacheStorage,
} from "../config/cache";

export type UseSubscriptionFlowOptions = {
  flowId: string;
  apiKey: string;
  userId?: string;
  locale?: string;
  platform?: "ios" | "android";
  country?: string;
  appVersion?: string;
  userType?: "new" | "returning";
  fallbackTemplate?: FallbackTemplateName;
  fetchImpl?: typeof fetch;
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
  const [flow, setFlow] = useState<FlowConfig | null>(null);
  const [experiment, setExperiment] = useState<UseSubscriptionFlowState["experiment"]>(null);
  const [paywalls, setPaywalls] = useState<GetFlowResponse["paywalls"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<UseSubscriptionFlowState["source"]>(null);

  const cache = useMemo(
    () => new FlowCache(options.cacheStorage ?? defaultFlowCacheStorage),
    [options.cacheStorage],
  );
  const locale = useMemo(() => resolveRuntimeLocale(options.locale), [options.locale]);
  const cacheKeyLocale = useMemo(
    () =>
      [
        locale ?? "default",
        options.platform ?? "platform:any",
        options.country ?? "country:any",
        options.appVersion ?? "version:any",
        options.userType ?? "user:any",
      ].join("|"),
    [
      locale,
      options.appVersion,
      options.country,
      options.platform,
      options.userType,
    ],
  );

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    const cached = await cache.getRecord(options.flowId, cacheKeyLocale);
    if (cached?.hasPaywallSnapshot) {
      setFlow(cached.config);
      setPaywalls(cached.paywalls);
      setExperiment(cached.experiment);
      setSource("cache");
      setLoading(false);
    }

    try {
      const remote = await fetchFlow({
        flowId: options.flowId,
        apiKey: options.apiKey,
        userId: options.userId,
        locale,
        platform: options.platform,
        country: options.country,
        appVersion: options.appVersion,
        userType: options.userType,
        fetchImpl: options.fetchImpl,
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

      if (options.fallbackTemplate) {
        const fallback = FALLBACK_TEMPLATES[options.fallbackTemplate];
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
    options.apiKey,
    options.appVersion,
    options.country,
    options.fallbackTemplate,
    options.fetchImpl,
    options.flowId,
    options.platform,
    options.userId,
    options.userType,
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
