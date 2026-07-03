import { AnalyticsEventSchema, type AnalyticsEvent } from "@onborn/sdk-contracts";
import { z } from "zod";
import type { AnalyticsStorage } from "./storage";

const QueueSchema = z.array(AnalyticsEventSchema);

export class AnalyticsQueue {
  /**
   * Serializes every queue operation. The underlying storage (e.g. AsyncStorage)
   * has no atomic read-modify-write, so concurrent `enqueue`/`trimStart` calls
   * could clobber each other and silently drop events — most visibly the first
   * event of a session (`flow_started`), which races with the startup flush.
   */
  private lock: Promise<void> = Promise.resolve();

  constructor(
    private readonly storage: AnalyticsStorage,
    private readonly queueKey: string,
    private readonly maxQueueSize?: number,
  ) {}

  async getAll(): Promise<AnalyticsEvent[]> {
    return this.runExclusive(() => this.readAll());
  }

  async enqueue(event: AnalyticsEvent): Promise<void> {
    await this.runExclusive(async () => {
      const queue = await this.readAll();
      queue.push(event);
      await this.persist(this.limitQueue(queue));
    });
  }

  async prepend(events: AnalyticsEvent[]): Promise<void> {
    await this.runExclusive(async () => {
      const queue = await this.readAll();
      await this.persist(this.limitQueue([...events, ...queue]));
    });
  }

  async trimStart(count: number): Promise<void> {
    await this.runExclusive(async () => {
      const queue = await this.readAll();
      const next = queue.slice(count);
      await this.persist(next);
    });
  }

  async size(): Promise<number> {
    const queue = await this.getAll();
    return queue.length;
  }

  async clear(): Promise<void> {
    await this.runExclusive(async () => {
      await this.storage.removeItem(this.queueKey);
    });
  }

  /** Runs `task` after any in-flight queue operation completes (FIFO lock). */
  private runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const result = this.lock.then(task, task);
    this.lock = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async readAll(): Promise<AnalyticsEvent[]> {
    const raw = await this.storage.getItem(this.queueKey);
    if (!raw) {
      return [];
    }

    try {
      const parsedJson = JSON.parse(raw) as unknown;
      const parsedQueue = QueueSchema.safeParse(parsedJson);
      if (!parsedQueue.success) {
        await this.storage.removeItem(this.queueKey);
        return [];
      }

      return parsedQueue.data;
    } catch {
      await this.storage.removeItem(this.queueKey);
      return [];
    }
  }

  private async persist(events: AnalyticsEvent[]): Promise<void> {
    await this.storage.setItem(this.queueKey, JSON.stringify(events));
  }

  private limitQueue(events: AnalyticsEvent[]): AnalyticsEvent[] {
    if (!this.maxQueueSize || this.maxQueueSize <= 0) {
      return events;
    }

    return events.slice(-this.maxQueueSize);
  }
}
