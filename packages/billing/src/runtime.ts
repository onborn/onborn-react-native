import {
  Onborn,
  type OnbornConfig,
} from "@onborn/analytics";

const GLOBAL_CONFIG_KEYS = [
  "apiKey",
  "userId",
  "locale",
  "appId",
  "platform",
  "country",
  "appVersion",
  "userType",
  "sdkVersion",
  "fetchImpl",
  "emitAnalyticsEvents",
  "emitSdkConnectionSignal",
  "autoFlushMs",
  "maxAnalyticsBatchSize",
  "maxAnalyticsQueueSize",
  "analyticsQueueKey",
  "analyticsStorage",
] as const satisfies ReadonlyArray<keyof OnbornConfig>;

export { Onborn };
export type { OnbornConfig };

export function resolveOnbornBillingConfig<T extends object>(
  overrides?: T,
): T & OnbornConfig {
  const globalConfig = Onborn.getConfig();
  if (!globalConfig) {
    throw new Error(
      "Onborn is not initialized. Call Onborn.init({ apiKey, ...config }) before using Onborn billing hooks.",
    );
  }

  const safeOverrides = { ...(overrides ?? {}) } as Record<string, unknown>;
  for (const key of GLOBAL_CONFIG_KEYS) {
    delete safeOverrides[key];
  }

  return {
    ...globalConfig,
    ...safeOverrides,
  } as T & OnbornConfig;
}

export function useOnbornBillingConfig<T extends object>(
  overrides?: T,
): T & OnbornConfig {
  return resolveOnbornBillingConfig(overrides);
}
