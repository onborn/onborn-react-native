import { type CustomerEntitlementsResponse } from "@onborn/sdk-contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOnbornRuntimeConfig } from "../config/Onborn";
import { createInternalClient } from "../core/client";

export type UseOnbornEntitlementsOptions = {
  autoLoad?: boolean;
};

export type UseOnbornEntitlementsState = {
  data: CustomerEntitlementsResponse | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<CustomerEntitlementsResponse>;
  hasEntitlement: (keyOrId: string) => boolean;
};

export function useOnbornEntitlements(
  options: UseOnbornEntitlementsOptions,
): UseOnbornEntitlementsState {
  const runtimeOptions = useOnbornRuntimeConfig(options);
  const [data, setData] = useState<CustomerEntitlementsResponse | null>(null);
  const [loading, setLoading] = useState(options.autoLoad !== false);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(
    () =>
      createInternalClient({
        apiKey: runtimeOptions.apiKey,
        flowId: "entitlements",
        userId: runtimeOptions.userId,
        locale: runtimeOptions.locale,
        appId: runtimeOptions.appId,
        platform: runtimeOptions.platform,
        appVersion: runtimeOptions.appVersion,
        sdkVersion: runtimeOptions.sdkVersion,
        fetchImpl: runtimeOptions.fetchImpl,
        emitAnalyticsEvents: runtimeOptions.emitAnalyticsEvents ?? false,
        emitSdkConnectionSignal:
          runtimeOptions.emitSdkConnectionSignal ?? false,
        autoFlushMs: runtimeOptions.autoFlushMs,
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

  const reload = useCallback(async (): Promise<CustomerEntitlementsResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.loadCustomerEntitlements(
        runtimeOptions.userId,
      );
      setData(response);
      return response;
    } catch (loadError) {
      const message = toError(loadError).message;
      setError(message);
      throw loadError;
    } finally {
      setLoading(false);
    }
  }, [client, runtimeOptions.userId]);

  useEffect(() => {
    if (options.autoLoad === false) {
      return;
    }
    void reload();
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
    error,
    reload,
    hasEntitlement,
  };
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Unknown error");
}
