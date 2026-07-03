import { type CustomerEntitlementsResponse } from "@onborn/sdk-contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient, type ConversionFlowClientOptions } from "../core/client";

export type UseOnbornEntitlementsOptions = Pick<
  ConversionFlowClientOptions,
  | "apiKey"
  | "userId"
  | "locale"
  | "appId"
  | "platform"
  | "appVersion"
  | "sdkVersion"
  | "fetchImpl"
  | "emitAnalyticsEvents"
  | "emitSdkConnectionSignal"
  | "autoFlushMs"
> & {
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
  const [data, setData] = useState<CustomerEntitlementsResponse | null>(null);
  const [loading, setLoading] = useState(options.autoLoad !== false);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(
    () =>
      createClient({
        apiKey: options.apiKey,
        flowId: "entitlements",
        userId: options.userId,
        locale: options.locale,
        appId: options.appId,
        platform: options.platform,
        appVersion: options.appVersion,
        sdkVersion: options.sdkVersion,
        fetchImpl: options.fetchImpl,
        emitAnalyticsEvents: options.emitAnalyticsEvents ?? false,
        emitSdkConnectionSignal: options.emitSdkConnectionSignal ?? false,
        autoFlushMs: options.autoFlushMs,
      }),
    [
      options.apiKey,
      options.appId,
      options.appVersion,
      options.autoFlushMs,
      options.emitAnalyticsEvents,
      options.emitSdkConnectionSignal,
      options.fetchImpl,
      options.locale,
      options.platform,
      options.sdkVersion,
      options.userId,
    ],
  );

  const reload = useCallback(async (): Promise<CustomerEntitlementsResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.loadCustomerEntitlements(options.userId);
      setData(response);
      return response;
    } catch (loadError) {
      const message = toError(loadError).message;
      setError(message);
      throw loadError;
    } finally {
      setLoading(false);
    }
  }, [client, options.userId]);

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
