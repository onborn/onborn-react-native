import { type CustomerEntitlementsResponse } from "@onborn/sdk-contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBillingClient } from "./client";
import { useOnbornBillingConfig } from "./runtime";

const ENTITLEMENTS_CACHE_PREFIX = "onborn:entitlements";

export type UseOnbornEntitlementsOptions = {
  autoLoad?: boolean;
  /**
   * Keep the last known entitlements in `analyticsStorage` and replay them on
   * the next cold start.
   *
   * Without this, `data` is null until the network answers, so a paying
   * customer sees the free experience for the first moments of every launch —
   * and for the whole session if they are offline. Cached entitlements are
   * marked `stale` until a fresh response arrives; they are a UX bridge, never
   * proof of entitlement (the server stays authoritative for anything that
   * actually matters).
   */
  cache?: boolean;
};

export type UseOnbornEntitlementsState = {
  data: CustomerEntitlementsResponse | null;
  loading: boolean;
  /** True while `data` comes from the cache and no fresh response has landed. */
  stale: boolean;
  error: string | null;
  reload: () => Promise<CustomerEntitlementsResponse>;
  hasEntitlement: (keyOrId: string) => boolean;
};

export function useOnbornEntitlements(
  options: UseOnbornEntitlementsOptions = {},
): UseOnbornEntitlementsState {
  const runtimeOptions = useOnbornBillingConfig(options);
  const [data, setData] = useState<CustomerEntitlementsResponse | null>(null);
  const [loading, setLoading] = useState(options.autoLoad !== false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const freshRef = useRef(false);
  // Monotonic id of the latest reload. A response only wins if it is still the
  // most recent request — so an in-flight fetch started BEFORE a purchase can
  // never overwrite the fetch fired AFTER it, whatever order they resolve in.
  const requestSeqRef = useRef(0);

  const client = useMemo(
    () =>
      createBillingClient({
        sourceId: "entitlements",
      }),
    [
      runtimeOptions.apiKey,
      runtimeOptions.appId,
      runtimeOptions.appVersion,
      runtimeOptions.autoFlushMs,
      runtimeOptions.emitAnalyticsEvents,
      runtimeOptions.emitSdkConnectionSignal,
      runtimeOptions.fetchImpl,
      runtimeOptions.locale,
      runtimeOptions.platform,
      runtimeOptions.sdkVersion,
      runtimeOptions.userId,
    ],
  );

  // Scope the cache to the user: a device that switches accounts (or upgrades
  // from anonymous to signed-in) must never replay the previous user's
  // entitlements.
  const cacheKey = options.cache
    ? `${ENTITLEMENTS_CACHE_PREFIX}:${runtimeOptions.userId ?? "anonymous"}`
    : null;
  const storage = options.cache ? runtimeOptions.analyticsStorage : undefined;

  const reload = useCallback(async (): Promise<CustomerEntitlementsResponse> => {
    const seq = (requestSeqRef.current += 1);
    setLoading(true);
    setError(null);
    try {
      const response = await client.loadCustomerEntitlements();
      // Superseded by a newer reload while this one was in flight: return the
      // value to this specific caller but do not let it become the shared
      // state, so a pre-purchase read can't clobber a post-purchase one.
      if (seq !== requestSeqRef.current) {
        return response;
      }
      freshRef.current = true;
      setData(response);
      setStale(false);
      if (storage && cacheKey) {
        void storage
          .setItem(cacheKey, JSON.stringify(response))
          .catch(() => undefined);
      }
      return response;
    } catch (loadError) {
      if (seq === requestSeqRef.current) {
        setError(toError(loadError).message);
      }
      throw loadError;
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [cacheKey, client, storage]);

  useEffect(() => {
    if (!storage || !cacheKey) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const cached = await storage.getItem(cacheKey);
        // A fresh response may have landed while storage was reading; it always
        // wins over the cache.
        if (cancelled || !cached || freshRef.current) {
          return;
        }
        setData(JSON.parse(cached) as CustomerEntitlementsResponse);
        setStale(true);
      } catch {
        // A corrupt or unreadable cache is not worth surfacing: the network
        // response is on its way regardless.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, storage]);

  useEffect(() => {
    if (options.autoLoad === false) {
      return;
    }
    void reload().catch(() => undefined);
  }, [options.autoLoad, reload]);

  const hasEntitlement = useCallback(
    (keyOrId: string) =>
      data?.entitlements.some(
        (item) =>
          item.active &&
          (item.key === keyOrId || item.entitlementId === keyOrId),
      ) ?? false,
    [data?.entitlements],
  );

  return {
    data,
    loading,
    stale,
    error,
    reload,
    hasEntitlement,
  };
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Unknown error");
}
