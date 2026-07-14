import type { AnalyticsEvent } from "@onborn/sdk-contracts";
import { buildAnalyticsEvent, type AnalyticsPlatform, type TrackEventInput } from "./events";
import { flushBatch, type FetchLike } from "./flush";
import { AnalyticsQueue } from "./queue";
import { MemoryAnalyticsStorage, type AnalyticsStorage } from "./storage";

const DEFAULT_QUEUE_KEY = "onborn:analytics:queue";
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_QUEUE_SIZE = 1000;
const DEFAULT_ONBORN_API_BASE_URL = "https://api.testing.onborn.app";

export type OnbornConfig = {
  apiKey: string;
  userId?: string;
  appId?: string;
  platform?: AnalyticsPlatform;
  locale?: string;
  country?: string;
  userType?: "new" | "returning";
  appVersion?: string;
  sdkVersion?: string;
  emitAnalyticsEvents?: boolean;
  emitSdkConnectionSignal?: boolean;
  autoFlushMs?: number;
  maxAnalyticsBatchSize?: number;
  maxAnalyticsQueueSize?: number;
  analyticsQueueKey?: string;
  analyticsStorage?: AnalyticsStorage;
  fetchImpl?: FetchLike;
};

type AnalyticsClientOptions = {
  apiKey: string;
  appId: string;
  platform: AnalyticsPlatform;
  locale?: string;
  country?: string;
  userType?: "new" | "returning";
  appVersion: string;
  sdkVersion: string;
  maxBatchSize?: number;
  maxQueueSize?: number;
  queueKey?: string;
  autoFlushMs?: number;
  storage?: AnalyticsStorage;
  fetchImpl?: FetchLike;
};

type WithOptionalUserId<T> = T extends { userId: string }
  ? Omit<T, "userId"> & { userId?: string }
  : T;

export type OnbornTrackEventInput = WithOptionalUserId<TrackEventInput>;

export type FlushSummary = {
  attempted: number;
  sent: number;
  failed: number;
  remaining: number;
};

class AnalyticsClient {
  private readonly queue: AnalyticsQueue;
  private readonly endpoint: string;
  private readonly maxBatchSize: number;
  private readonly autoFlushMs?: number;
  private readonly fetchImpl?: FetchLike;
  private readonly context: {
    appId: string;
    platform: AnalyticsPlatform;
    locale?: string;
    country?: string;
    userType?: "new" | "returning";
    appVersion: string;
    sdkVersion: string;
  };
  private autoFlushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;

  constructor(private readonly options: AnalyticsClientOptions) {
    this.maxBatchSize = options.maxBatchSize ?? DEFAULT_BATCH_SIZE;
    this.autoFlushMs = options.autoFlushMs;
    this.fetchImpl = options.fetchImpl;
    this.context = {
      appId: options.appId,
      platform: options.platform,
      locale: options.locale,
      country: options.country,
      userType: options.userType,
      appVersion: options.appVersion,
      sdkVersion: options.sdkVersion,
    };

    this.queue = new AnalyticsQueue(
      options.storage ?? new MemoryAnalyticsStorage(),
      options.queueKey ?? DEFAULT_QUEUE_KEY,
      options.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE,
    );

    this.endpoint = buildEventsEndpoint(DEFAULT_ONBORN_API_BASE_URL);
  }

  async track(input: TrackEventInput): Promise<AnalyticsEvent> {
    const event = buildAnalyticsEvent(input, this.context);
    await this.queue.enqueue(event);
    return event;
  }

  async flush(): Promise<FlushSummary> {
    if (this.isFlushing) {
      return {
        attempted: 0,
        sent: 0,
        failed: 0,
        remaining: await this.queue.size(),
      };
    }

    this.isFlushing = true;
    let attempted = 0;
    let sent = 0;
    let failed = 0;

    try {
      while (true) {
        const queueItems = await this.queue.getAll();
        if (queueItems.length === 0) {
          break;
        }

        const batch = queueItems.slice(0, this.maxBatchSize);
        attempted += batch.length;

        const result = await flushBatch({
          events: batch,
          endpoint: this.endpoint,
          apiKey: this.options.apiKey,
          fetchImpl: this.fetchImpl,
        });

        if (!result.requestSucceeded) {
          break;
        }

        sent += result.received;
        failed += result.failed;
        await this.queue.trimStart(batch.length);
      }
    } finally {
      this.isFlushing = false;
    }

    return {
      attempted,
      sent,
      failed,
      remaining: await this.queue.size(),
    };
  }

  startAutoFlush(): void {
    if (!this.autoFlushMs || this.autoFlushMs <= 0 || this.autoFlushTimer) {
      return;
    }

    this.autoFlushTimer = setInterval(() => {
      void this.flush();
    }, this.autoFlushMs);
  }

  stopAutoFlush(): void {
    if (!this.autoFlushTimer) {
      return;
    }

    clearInterval(this.autoFlushTimer);
    this.autoFlushTimer = null;
  }

  async getQueueSize(): Promise<number> {
    return this.queue.size();
  }

  async resetQueue(): Promise<void> {
    await this.queue.clear();
  }
}

let globalOnbornConfig: OnbornConfig | null = null;
let globalAnalyticsClient: AnalyticsClient | null = null;

export const Onborn = {
  init(config: OnbornConfig): void {
    globalAnalyticsClient?.stopAutoFlush();
    globalOnbornConfig = { ...config };
    globalAnalyticsClient = new AnalyticsClient({
      apiKey: config.apiKey,
      appId: config.appId ?? "onborn.app",
      platform: config.platform ?? inferPlatform(),
      locale: config.locale,
      country: config.country,
      userType: config.userType,
      appVersion: config.appVersion ?? "0.0.0",
      sdkVersion: config.sdkVersion ?? "0.1.0",
      maxBatchSize: config.maxAnalyticsBatchSize,
      maxQueueSize: config.maxAnalyticsQueueSize,
      queueKey: config.analyticsQueueKey,
      autoFlushMs: config.autoFlushMs,
      storage: config.analyticsStorage,
      fetchImpl: config.fetchImpl,
    });
    globalAnalyticsClient.startAutoFlush();
  },

  getConfig(): OnbornConfig | null {
    return globalOnbornConfig ? { ...globalOnbornConfig } : null;
  },

  async track(input: OnbornTrackEventInput): Promise<AnalyticsEvent> {
    const client = requireAnalyticsClient();
    const config = requireOnbornConfig();
    const candidate =
      config.userId && !("userId" in input && input.userId)
        ? { ...input, userId: config.userId }
        : input;
    return client.track(candidate as TrackEventInput);
  },

  flush(): Promise<FlushSummary> {
    return requireAnalyticsClient().flush();
  },

  startAutoFlush(): void {
    requireAnalyticsClient().startAutoFlush();
  },

  stopAutoFlush(): void {
    requireAnalyticsClient().stopAutoFlush();
  },

  getQueueSize(): Promise<number> {
    return requireAnalyticsClient().getQueueSize();
  },

  resetQueue(): Promise<void> {
    return requireAnalyticsClient().resetQueue();
  },
};

function requireOnbornConfig(): OnbornConfig {
  if (!globalOnbornConfig) {
    throw new Error(
      "Onborn is not initialized. Call Onborn.init({ apiKey, ...config }) before using analytics.",
    );
  }
  return globalOnbornConfig;
}

function requireAnalyticsClient(): AnalyticsClient {
  if (!globalAnalyticsClient) {
    requireOnbornConfig();
    throw new Error("Onborn analytics client is not initialized.");
  }
  return globalAnalyticsClient;
}

function buildEventsEndpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/events`;
}

function inferPlatform(): AnalyticsPlatform {
  const userAgent = globalThis.navigator?.userAgent?.toLowerCase() ?? "";
  return userAgent.includes("android") ? "android" : "ios";
}
