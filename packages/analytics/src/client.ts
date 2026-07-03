import type { AnalyticsEvent } from "@onborn/sdk-contracts";
import { buildAnalyticsEvent, type AnalyticsPlatform, type TrackEventInput } from "./events";
import { flushBatch, type FetchLike } from "./flush";
import { AnalyticsQueue } from "./queue";
import { MemoryAnalyticsStorage, type AnalyticsStorage } from "./storage";

const DEFAULT_QUEUE_KEY = "onborn:analytics:queue";
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_QUEUE_SIZE = 1000;
const DEFAULT_ONBORN_API_BASE_URL = "https://api.testing.onborn.app";

export type AnalyticsClientOptions = {
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

export type FlushSummary = {
  attempted: number;
  sent: number;
  failed: number;
  remaining: number;
};

export class AnalyticsClient {
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

export function createAnalyticsClient(options: AnalyticsClientOptions): AnalyticsClient {
  return new AnalyticsClient(options);
}

function buildEventsEndpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/events`;
}
