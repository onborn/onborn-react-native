export type OnbornConfig = {
  apiKey: string;
  userId?: string;
  locale?: string;
  appId?: string;
  platform?: "ios" | "android";
  country?: string;
  appVersion?: string;
  userType?: "new" | "returning";
  sdkVersion?: string;
  fetchImpl?: typeof fetch;
  emitAnalyticsEvents?: boolean;
  emitSdkConnectionSignal?: boolean;
  autoFlushMs?: number;
  maxAnalyticsQueueSize?: number;
};

let globalOnbornConfig: OnbornConfig | null = null;

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
  "maxAnalyticsQueueSize",
] as const satisfies ReadonlyArray<keyof OnbornConfig>;

export const Onborn = {
  init(config: OnbornConfig): void {
    globalOnbornConfig = { ...config };
  },

  getConfig(): OnbornConfig | null {
    return globalOnbornConfig;
  },
};

export function resolveOnbornRuntimeConfig<T extends object>(
  overrides?: T,
): T & OnbornConfig {
  if (!globalOnbornConfig) {
    throw new Error(
      "Onborn SDK is not initialized. Call Onborn.init({ apiKey, ...config }) before rendering Onborn components or using Onborn hooks.",
    );
  }

  const safeOverrides = { ...(overrides ?? {}) } as Record<string, unknown>;
  for (const key of GLOBAL_CONFIG_KEYS) {
    delete safeOverrides[key];
  }

  return {
    ...globalOnbornConfig,
    ...safeOverrides,
  } as T & OnbornConfig;
}

export function useOnbornRuntimeConfig<T extends object>(overrides?: T): T &
  OnbornConfig {
  return resolveOnbornRuntimeConfig(overrides);
}
