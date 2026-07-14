import {
  Onborn as AnalyticsOnborn,
  type OnbornConfig as AnalyticsOnbornConfig,
} from "@onborn/analytics";
import { defaultAnalyticsStorage } from "./analyticsStorage";

export type OnbornConfig = Omit<AnalyticsOnbornConfig, "analyticsStorage">;

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
] as const satisfies ReadonlyArray<keyof OnbornConfig>;

export const Onborn = {
  ...AnalyticsOnborn,

  init(config: OnbornConfig): void {
    AnalyticsOnborn.init({
      ...config,
      analyticsStorage: defaultAnalyticsStorage,
    });
  },

  getConfig(): OnbornConfig | null {
    const config = AnalyticsOnborn.getConfig();
    if (!config) {
      return null;
    }
    const publicConfig = { ...config } as Record<string, unknown>;
    delete publicConfig.analyticsStorage;
    return publicConfig as OnbornConfig;
  },
};

export function resolveOnbornRuntimeConfig<T extends object>(
  overrides?: T,
): T & OnbornConfig {
  const globalConfig = Onborn.getConfig();
  if (!globalConfig) {
    throw new Error(
      "Onborn SDK is not initialized. Call Onborn.init({ apiKey, ...config }) before rendering Onborn components or using Onborn hooks.",
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

export function useOnbornRuntimeConfig<T extends object>(overrides?: T): T &
  OnbornConfig {
  return resolveOnbornRuntimeConfig(overrides);
}
