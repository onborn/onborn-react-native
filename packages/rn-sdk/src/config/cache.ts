import {
  FlowConfigSchema,
  type FlowConfig,
  type GetFlowResponse,
} from "@onborn/sdk-contracts";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface FlowCacheStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export class MemoryFlowCacheStorage implements FlowCacheStorage {
  private readonly storage = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }
}

export class AsyncStorageFlowCacheStorage implements FlowCacheStorage {
  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }
}

type CachedFlowRecord = {
  config: FlowConfig;
  paywalls?: GetFlowResponse["paywalls"];
  experiment?: NonNullable<GetFlowResponse["experiment"]> | null;
  cachedAt: number;
};

export type FlowCacheRecord = {
  config: FlowConfig;
  paywalls: GetFlowResponse["paywalls"];
  experiment: NonNullable<GetFlowResponse["experiment"]> | null;
  hasPaywallSnapshot: boolean;
};

export class FlowCache {
  constructor(
    private readonly storage: FlowCacheStorage,
    private readonly namespace = "onborn:flow-cache",
  ) {}

  async get(flowId: string, locale?: string): Promise<FlowConfig | null> {
    const record = await this.getRecord(flowId, locale);
    return record?.config ?? null;
  }

  async getRecord(
    flowId: string,
    locale?: string,
  ): Promise<FlowCacheRecord | null> {
    const raw = await this.getRaw(flowId, locale);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as CachedFlowRecord;
      const validated = FlowConfigSchema.safeParse(parsed.config);
      if (!validated.success) {
        return null;
      }
      return {
        config: validated.data,
        paywalls: Array.isArray(parsed.paywalls) ? parsed.paywalls : [],
        experiment: parsed.experiment ?? null,
        hasPaywallSnapshot: Array.isArray(parsed.paywalls),
      };
    } catch {
      return null;
    }
  }

  async set(flow: FlowConfig, locale?: string): Promise<void> {
    const payload: CachedFlowRecord = {
      config: flow,
      cachedAt: Date.now(),
    };
    try {
      await this.storage.setItem(this.key(flow.id, locale), JSON.stringify(payload));
    } catch {
      // Offline cache should never break the live subscription flow.
    }
  }

  async setResponse(
    response: {
      config: unknown;
      paywalls?: GetFlowResponse["paywalls"];
      experiment?: NonNullable<GetFlowResponse["experiment"]> | null;
    },
    locale?: string,
  ): Promise<void> {
    const validated = FlowConfigSchema.safeParse(response.config);
    if (!validated.success) {
      return;
    }
    const payload: CachedFlowRecord = {
      config: validated.data,
      paywalls: response.paywalls ?? [],
      experiment: response.experiment ?? null,
      cachedAt: Date.now(),
    };
    try {
      await this.storage.setItem(
        this.key(validated.data.id, locale),
        JSON.stringify(payload),
      );
    } catch {
      // Offline cache should never break the live subscription flow.
    }
  }

  private key(flowId: string, locale?: string): string {
    return locale
      ? `${this.namespace}:${flowId}:${locale}`
      : `${this.namespace}:${flowId}`;
  }

  private async getRaw(flowId: string, locale?: string): Promise<string | null> {
    try {
      return await this.storage.getItem(this.key(flowId, locale));
    } catch {
      return null;
    }
  }
}

export const defaultFlowCacheStorage = new AsyncStorageFlowCacheStorage();
