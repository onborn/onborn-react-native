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
  | "sdkVersion"
  | "flowName";

type AnalyticsEventWithoutCommon<T extends AnalyticsEvent["type"]> = Omit<
  Extract<AnalyticsEvent, { type: T }>,
  CommonEventFields
>;

export type TrackEventInput = {
  [K in AnalyticsEvent["type"]]: AnalyticsEventWithoutCommon<K>;
}[AnalyticsEvent["type"]] & {
  /**
   * Overrides the configured name for this event. SDKs that already know the
   * flow they render (the React Native SDK) set it per event; standalone
   * integrations name their flows once in `Onborn.init`.
   */
  flowName?: string;
};

export type EventContext = {
  appId: string;
  platform: AnalyticsPlatform;
  locale?: string;
  country?: string;
  userType?: "new" | "returning";
  appVersion: string;
  sdkVersion: string;
  onboardingFlowName?: string;
  paywallName?: string;
};

/** Thrown when an event has no name to report — see `Onborn.init`. */
export class OnbornMissingFlowNameError extends Error {
  constructor(eventType: string, configKey: string) {
    super(
      `Onborn: cannot track "${eventType}" without a flow name. ` +
        `Pass \`${configKey}\` to Onborn.init(), or set \`flowName\` on the event.`,
    );
    this.name = "OnbornMissingFlowNameError";
  }
}

function isPaywallEvent(type: string): boolean {
  return type.startsWith("paywall_");
}

/**
 * Which configured name an event belongs to. Paywall events carry the paywall
 * name; everything else describes the onboarding flow.
 */
function resolveFlowName(
  input: TrackEventInput,
  context: EventContext,
): string {
  const explicit = input.flowName?.trim();
  if (explicit) {
    return explicit;
  }
  const paywall = isPaywallEvent(input.type);
  const configured = (
    paywall ? context.paywallName : context.onboardingFlowName
  )?.trim();
  if (configured) {
    return configured;
  }
  throw new OnbornMissingFlowNameError(
    input.type,
    paywall ? "paywallName" : "onboardingFlowName",
  );
}

export function buildAnalyticsEvent(
  input: TrackEventInput,
  context: EventContext,
  timestamp = Date.now(),
): AnalyticsEvent {
  const candidate = {
    ...input,
    flowName: resolveFlowName(input, context),
    eventId: createEventId(),
    timestamp,
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
