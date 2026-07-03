import {
  BatchEventsRequestSchema,
  BatchEventsResponseSchema,
  type AnalyticsEvent,
  type BatchEventsResponse,
} from "@onborn/sdk-contracts";

export type FetchLike = typeof fetch;

export type FlushBatchResult = {
  received: number;
  failed: number;
  requestSucceeded: boolean;
};

export async function flushBatch(options: {
  events: AnalyticsEvent[];
  endpoint: string;
  apiKey: string;
  fetchImpl?: FetchLike;
}): Promise<FlushBatchResult> {
  const { events, endpoint, apiKey, fetchImpl = fetch } = options;

  if (events.length === 0) {
    return {
      received: 0,
      failed: 0,
      requestSucceeded: true,
    };
  }

  const payload = BatchEventsRequestSchema.parse({ events });

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.error(
          `[onborn/analytics] Invalid SDK API key. Received ${response.status} while sending events.`,
        );
      }
      return {
        received: 0,
        failed: 0,
        requestSucceeded: false,
      };
    }

    const data = (await response.json()) as unknown;
    const parsed = BatchEventsResponseSchema.safeParse(data);
    const normalized: BatchEventsResponse = parsed.success
      ? parsed.data
      : { received: events.length, failed: 0 };

    return {
      received: normalized.received,
      failed: normalized.failed,
      requestSucceeded: true,
    };
  } catch {
    return {
      received: 0,
      failed: 0,
      requestSucceeded: false,
    };
  }
}
