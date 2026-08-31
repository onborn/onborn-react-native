import {
  Onborn,
  type OnbornConfig,
  type TrackEventInput,
} from "@onborn/analytics";
import { resolveOnbornBillingConfig } from "./runtime";
import {
  CustomerEntitlementsResponseSchema,
  GetOfferingResponseSchema,
  PurchaseValidationResponseSchema,
  type CustomerEntitlementsResponse,
  type GetOfferingResponse,
  type PurchaseValidationResponse,
  type RestorePurchasesRequest,
  type ValidatePurchaseRequest,
} from "@onborn/sdk-contracts";

const ONBORN_API_BASE_URL = "https://api.testing.onborn.app";

export type BillingClientOptions = {
  sourceId?: string;
  /** Name reported with paywall events when the paywall config has none. */
  paywallName?: string;
};

export class OnbornBillingRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "OnbornBillingRequestError";
  }
}

type BillingTrackInput = TrackEventInput extends infer Event
  ? Event extends unknown
    ? Omit<Event, "flowId" | "userId">
    : never
  : never;

export class BillingClient {
  private readonly config: OnbornConfig;
  private readonly userId: string;
  private readonly fetchImpl: typeof fetch;
  private readonly emitAnalyticsEvents: boolean;
  /** Honors the shared config's apiBaseUrl, like the analytics client. */
  private readonly apiBaseUrl: string;

  constructor(private readonly options: BillingClientOptions = {}) {
    this.config = resolveOnbornBillingConfig();
    this.userId = this.config.userId ?? createAnonymousUserId();
    this.fetchImpl = this.config.fetchImpl ?? fetch;
    this.emitAnalyticsEvents = this.config.emitAnalyticsEvents !== false;
    this.apiBaseUrl = this.config.apiBaseUrl ?? ONBORN_API_BASE_URL;
  }

  /**
   * Loads the offering a paywall names, or the environment's current one.
   *
   * A named offering that does not exist fails rather than falling back: the
   * flow asked to sell something specific, and quietly charging for the
   * current offering's plans instead would be the wrong products at the wrong
   * prices.
   */
  async loadOffering(key?: string): Promise<GetOfferingResponse> {
    const url = this.runtimeUrl(
      key
        ? `/offerings/current?key=${encodeURIComponent(key)}`
        : "/offerings/current",
    );
    const payload = await this.getJson(
      url,
      key ? `offering '${key}'` : "current offering",
    );
    const parsed = GetOfferingResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Invalid offering response payload");
    }
    return parsed.data;
  }

  async validatePurchase(
    input: Omit<ValidatePurchaseRequest, "userId">,
  ): Promise<PurchaseValidationResponse> {
    return this.sendPurchaseRequest("/purchases/validate", {
      ...input,
      userId: this.userId,
    });
  }

  async restorePurchases(
    input: Omit<RestorePurchasesRequest, "userId">,
  ): Promise<PurchaseValidationResponse> {
    return this.sendPurchaseRequest("/purchases/restore", {
      ...input,
      userId: this.userId,
    });
  }

  /**
   * Redeems a web-purchase claim for this device's identity.
   *
   * The claim arrives as the magic-link token or the typed code from the
   * checkout email — one method takes either. On success the backend links
   * this userId to the web purchaser's identity, and every entitlement read
   * from then on sees the web subscription; the returned entitlements are
   * the fresh, post-link read.
   */
  async redeemEntitlementClaim(
    claim: string,
  ): Promise<CustomerEntitlementsResponse & { linkedUserId: string }> {
    const url = new URL(`${this.apiBaseUrl}/entitlements/claims/redeem`);
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ claim, userId: this.userId }),
    });
    const payload = (await response.json().catch(() => null)) as {
      linkedUserId?: unknown;
      entitlements?: unknown;
      error?: unknown;
      code?: unknown;
    } | null;
    if (!response.ok) {
      throw new OnbornBillingRequestError(
        typeof payload?.error === "string"
          ? payload.error
          : "Claim redemption failed",
        response.status,
        typeof payload?.code === "string" ? payload.code : undefined,
      );
    }
    const parsed = CustomerEntitlementsResponseSchema.safeParse(payload);
    if (!parsed.success || typeof payload?.linkedUserId !== "string") {
      throw new Error("Invalid claim redemption response payload");
    }
    return { ...parsed.data, linkedUserId: payload.linkedUserId };
  }

  async loadCustomerEntitlements(): Promise<CustomerEntitlementsResponse> {
    const url = new URL(`${this.apiBaseUrl}/entitlements`);
    url.searchParams.set("userId", this.userId);
    const payload = await this.getJson(url, "customer entitlements");
    const parsed = CustomerEntitlementsResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Invalid customer entitlements response payload");
    }
    return parsed.data;
  }

  trackPaywallPackageSelected(
    params: PaywallPackageEvent & { packageId: string },
  ): Promise<void> {
    return this.track({ type: "paywall_package_selected", ...params });
  }

  trackPaywallPurchaseStarted(params: PaywallPackageEvent): Promise<void> {
    return this.track({ type: "paywall_purchase_started", ...params });
  }

  trackPaywallTrialStarted(
    params: PaywallPackageEvent & { trialPeriod?: string },
  ): Promise<void> {
    return this.track({ type: "paywall_trial_started", ...params });
  }

  trackPaywallPurchaseFailed(
    params: PaywallPackageEvent & {
      reason: "cancelled" | "error" | "pending";
      message?: string;
    },
  ): Promise<void> {
    return this.track({ type: "paywall_purchase_failed", ...params });
  }

  trackPaywallConverted(
    params: PaywallBaseEvent & { productId: string; priceUsd?: number },
  ): Promise<void> {
    return this.track({ type: "paywall_converted", ...params });
  }

  trackPaywallRestoreStarted(params: PaywallBaseEvent): Promise<void> {
    return this.track({ type: "paywall_restore_started", ...params });
  }

  trackPaywallRestoreCompleted(
    params: PaywallBaseEvent & { restored: boolean },
  ): Promise<void> {
    return this.track({ type: "paywall_restore_completed", ...params });
  }

  trackPaywallRestoreFailed(
    params: PaywallBaseEvent & { message?: string },
  ): Promise<void> {
    return this.track({ type: "paywall_restore_failed", ...params });
  }

  async flushEvents(): Promise<void> {
    if (this.emitAnalyticsEvents) {
      await Onborn.flush();
    }
  }

  private runtimeUrl(path: string): URL {
    const url = new URL(`${this.apiBaseUrl}${path}`);
    appendParam(url, "userId", this.userId);
    appendParam(url, "locale", this.config.locale);
    appendParam(url, "platform", this.config.platform);
    appendParam(url, "country", this.config.country);
    appendParam(url, "appVersion", this.config.appVersion);
    appendParam(url, "userType", this.config.userType);
    return url;
  }

  private async getJson(url: URL, label: string): Promise<unknown> {
    const response = await this.fetchImpl(url.toString(), {
      headers: this.authorizationHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${label} (${response.status})`);
    }
    return response.json();
  }

  private async sendPurchaseRequest(
    path: "/purchases/validate" | "/purchases/restore",
    payload: ValidatePurchaseRequest | RestorePurchasesRequest,
  ): Promise<PurchaseValidationResponse> {
    const response = await this.fetchImpl(`${this.apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        ...this.authorizationHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const failure = await readBillingFailure(response);
      throw new OnbornBillingRequestError(
        failure.message ?? `Purchase request failed (${response.status})`,
        response.status,
        failure.code,
      );
    }
    const parsed = PurchaseValidationResponseSchema.safeParse(
      await response.json(),
    );
    if (!parsed.success) {
      throw new Error("Invalid purchase validation response payload");
    }
    return parsed.data;
  }

  private authorizationHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.config.apiKey}` };
  }

  private async track(input: BillingTrackInput): Promise<void> {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    await Onborn.track({
      ...input,
      flowId: this.options.sourceId ?? "billing",
      flowName: this.options.paywallName ?? "Paywall",
      userId: this.userId,
    } as TrackEventInput);
  }
}

async function readBillingFailure(
  response: Response,
): Promise<{ message?: string; code?: string }> {
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    return {
      message:
        typeof payload.error === "string"
          ? payload.error
          : typeof payload.message === "string"
            ? payload.message
            : undefined,
      code: typeof payload.code === "string" ? payload.code : undefined,
    };
  } catch {
    return {};
  }
}

type PaywallBaseEvent = {
  sessionId: string;
  stepId: string;
  paywallId?: string;
  paywallTemplate: string;
  variant?: string;
};

type PaywallPackageEvent = PaywallBaseEvent & {
  packageId?: string;
  productId?: string;
};

export function createBillingClient(
  options: BillingClientOptions = {},
): BillingClient {
  return new BillingClient(options);
}

function appendParam(url: URL, key: string, value: string | undefined): void {
  if (value) {
    url.searchParams.set(key, value);
  }
}

function createAnonymousUserId(): string {
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
