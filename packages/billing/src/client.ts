import {
  Onborn,
  type OnbornConfig,
  type TrackEventInput,
} from "@onborn/analytics";
import { resolveOnbornBillingConfig } from "./runtime";
import {
  CustomerEntitlementsResponseSchema,
  GetOfferingResponseSchema,
  GetPaywallResponseSchema,
  PurchaseValidationResponseSchema,
  type CustomerEntitlementsResponse,
  type GetOfferingResponse,
  type GetPaywallResponse,
  type PurchaseValidationResponse,
  type RestorePurchasesRequest,
  type ValidatePurchaseRequest,
} from "@onborn/sdk-contracts";

const ONBORN_API_BASE_URL = "https://api.testing.onborn.app";

export type BillingClientOptions = {
  sourceId?: string;
};

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

  constructor(private readonly options: BillingClientOptions = {}) {
    this.config = resolveOnbornBillingConfig();
    this.userId = this.config.userId ?? createAnonymousUserId();
    this.fetchImpl = this.config.fetchImpl ?? fetch;
    this.emitAnalyticsEvents = this.config.emitAnalyticsEvents !== false;
  }

  async loadPaywall(paywallId: string): Promise<GetPaywallResponse> {
    const url = this.runtimeUrl(`/paywalls/${encodeURIComponent(paywallId)}`);
    const payload = await this.getJson(url, `paywall '${paywallId}'`);
    const parsed = GetPaywallResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Invalid paywall response payload");
    }
    return parsed.data;
  }

  async loadOffering(): Promise<GetOfferingResponse> {
    const url = this.runtimeUrl("/offerings/current");
    const payload = await this.getJson(url, "current offering");
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

  async loadCustomerEntitlements(): Promise<CustomerEntitlementsResponse> {
    const url = new URL(`${ONBORN_API_BASE_URL}/entitlements`);
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
    const url = new URL(`${ONBORN_API_BASE_URL}${path}`);
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
    const response = await this.fetchImpl(`${ONBORN_API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        ...this.authorizationHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Purchase request failed (${response.status})`);
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
      userId: this.userId,
    } as TrackEventInput);
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

function appendParam(
  url: URL,
  key: string,
  value: string | undefined,
): void {
  if (value) {
    url.searchParams.set(key, value);
  }
}

function createAnonymousUserId(): string {
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
