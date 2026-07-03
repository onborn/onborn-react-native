import { AnalyticsEventSchema, type AnalyticsEvent } from "@onborn/sdk-contracts";

export type AnalyticsPlatform = "ios" | "android";

type CommonEventFields =
  | "eventId"
  | "timestamp"
  | "appId"
  | "platform"
  | "locale"
  | "country"
  | "userType"
  | "appVersion"
  | "sdkVersion";

type AnalyticsEventWithoutCommon<T extends AnalyticsEvent["type"]> = Omit<
  Extract<AnalyticsEvent, { type: T }>,
  CommonEventFields
>;

export type TrackEventInput = {
  [K in AnalyticsEvent["type"]]: AnalyticsEventWithoutCommon<K>;
}[AnalyticsEvent["type"]];

export type EventContext = {
  appId: string;
  platform: AnalyticsPlatform;
  locale?: string;
  country?: string;
  userType?: "new" | "returning";
  appVersion: string;
  sdkVersion: string;
};

export function buildAnalyticsEvent(input: TrackEventInput, context: EventContext): AnalyticsEvent {
  const candidate = {
    ...input,
    eventId: createEventId(),
    timestamp: Date.now(),
    appId: context.appId,
    platform: context.platform,
    locale: context.locale,
    country: context.country,
    userType: context.userType,
    appVersion: context.appVersion,
    sdkVersion: context.sdkVersion,
  };

  return AnalyticsEventSchema.parse(candidate);
}

function createEventId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) {
    return randomUuid;
  }

  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // RFC 4122 v4 bits.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
