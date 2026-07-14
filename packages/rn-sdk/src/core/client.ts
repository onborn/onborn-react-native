import {
  createAnalyticsClient,
  type AnalyticsClient,
  type AnalyticsClientOptions,
  type TrackEventInput,
} from "@onborn/analytics";
import type {
  CustomerEntitlementsResponse,
  FlowConfig,
  GetFlowResponse,
  GetOfferingResponse,
  GetPaywallResponse,
  PurchaseValidationResponse,
  RestorePurchasesRequest,
  ValidatePurchaseRequest,
} from "@onborn/sdk-contracts";
import { defaultAnalyticsStorage } from "../config/analyticsStorage";
import {
  fetchCustomerEntitlements,
  fetchOffering,
  fetchFlowConfig,
  fetchPaywall,
  restorePurchasesRequest,
  validatePurchaseRequest,
  type CustomerEntitlementsFetchOptions,
  type OfferingFetchOptions,
  type FlowFetchOptions,
  type PaywallFetchOptions,
  type PurchaseRequestOptions,
} from "../config/fetcher";
import { resolveRuntimeLocale } from "../config/locale";

export type ConversionFlowClientOptions = {
  apiKey: string;
  flowId: string;
  userId?: string;
  locale?: string;
  appId?: string;
  platform?: "ios" | "android";
  country?: string;
  appVersion?: string;
  userType?: "new" | "returning";
  sdkVersion?: string;
  /**
   * Enables flow/paywall analytics events.
   * Set to false for internal preview tools (e.g. Builder).
   */
  emitAnalyticsEvents?: boolean;
  /**
   * Emits one `sdk_connection_established` event on client creation.
   * Set to false for internal tools/previews (e.g. Builder) to avoid
   * marking workspace SDK as connected.
   */
  emitSdkConnectionSignal?: boolean;
  autoFlushMs?: number;
  maxAnalyticsQueueSize?: number;
  fetchImpl?: typeof fetch;
};

const sentConnectionSignals = new Set<string>();

export type RuntimeExperimentContext = NonNullable<GetFlowResponse["experiment"]>;

export class ConversionFlowClient {
  private readonly options: ConversionFlowClientOptions;
  private readonly userId: string;
  private readonly analytics: AnalyticsClient;
  private readonly emitAnalyticsEvents: boolean;
  private experimentContext: RuntimeExperimentContext | null = null;
  private sdkConnectionTracked = false;

  constructor(options: ConversionFlowClientOptions) {
    this.options = {
      ...options,
      locale: resolveRuntimeLocale(options.locale),
    };
    this.userId = options.userId ?? createAnonymousUserId();
    this.analytics = createAnalyticsClient(
      this.analyticsOptionsFromConfig(this.options),
    );
    this.emitAnalyticsEvents = options.emitAnalyticsEvents !== false;
    if (this.emitAnalyticsEvents && options.emitSdkConnectionSignal !== false) {
      // Fire-and-forget: mark SDK connection as soon as client is initialized.
      void this.trackSdkConnectionEstablished();
    }
  }

  async loadFlow(): Promise<FlowConfig> {
    return fetchFlowConfig(this.flowFetchOptionsFromConfig(this.options));
  }

  setExperimentContext(context?: RuntimeExperimentContext | null): void {
    this.experimentContext = context ?? null;
  }

  async loadPaywall(paywallId: string): Promise<GetPaywallResponse> {
    return fetchPaywall(
      this.paywallFetchOptionsFromConfig(this.options, paywallId),
    );
  }

  async loadOffering(offeringId: string): Promise<GetOfferingResponse> {
    return fetchOffering(
      this.offeringFetchOptionsFromConfig(this.options, offeringId),
    );
  }

  async validatePurchase(
    input: Omit<ValidatePurchaseRequest, "userId"> & {
      userId?: string;
    },
  ): Promise<PurchaseValidationResponse> {
    return validatePurchaseRequest({
      ...this.purchaseRequestOptionsFromConfig(this.options),
      payload: {
        ...input,
        userId: input.userId ?? this.userId,
      },
    });
  }

  async restorePurchases(
    input: Omit<RestorePurchasesRequest, "userId"> & {
      userId?: string;
    },
  ): Promise<PurchaseValidationResponse> {
    return restorePurchasesRequest({
      ...this.purchaseRequestOptionsFromConfig(this.options),
      payload: {
        ...input,
        userId: input.userId ?? this.userId,
      },
    });
  }

  async loadCustomerEntitlements(
    userId = this.userId,
  ): Promise<CustomerEntitlementsResponse> {
    return fetchCustomerEntitlements({
      ...this.customerEntitlementsFetchOptionsFromConfig(this.options),
      userId,
    });
  }

  async trackFlowStarted(sessionId: string, variant?: string): Promise<void> {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    await this.track({
      type: "flow_started",
      flowId: this.options.flowId,
      sessionId,
      userId: this.userId,
      variant,
    });
  }

  async trackStepViewed(params: {
    sessionId: string;
    stepId: string;
    stepType: string;
    stepIndex: number;
  }): Promise<void> {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    await this.track({
      type: "step_viewed",
      flowId: this.options.flowId,
      sessionId: params.sessionId,
      userId: this.userId,
      stepId: params.stepId,
      stepType: params.stepType,
      stepIndex: params.stepIndex,
    });
  }

  async trackStepCompleted(params: {
    sessionId: string;
    stepId: string;
    stepType: string;
    stepIndex: number;
    timeSpentMs: number;
    answer?: unknown;
  }): Promise<void> {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    await this.track({
      type: "step_completed",
      flowId: this.options.flowId,
      sessionId: params.sessionId,
      userId: this.userId,
      stepId: params.stepId,
      stepType: params.stepType,
      stepIndex: params.stepIndex,
      timeSpentMs: params.timeSpentMs,
      answer: params.answer,
    });
  }

  async trackStepSkipped(params: {
    sessionId: string;
    stepId: string;
    stepIndex: number;
  }): Promise<void> {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    await this.track({
      type: "step_skipped",
      flowId: this.options.flowId,
      sessionId: params.sessionId,
      userId: this.userId,
      stepId: params.stepId,
      stepIndex: params.stepIndex,
    });
  }

  async trackFlowCompleted(params: {
    sessionId: string;
    totalTimeMs: number;
    stepsCompleted: number;
    variant?: string;
  }): Promise<void> {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    await this.track({
      type: "flow_completed",
      flowId: this.options.flowId,
      sessionId: params.sessionId,
      userId: this.userId,
      totalTimeMs: params.totalTimeMs,
      stepsCompleted: params.stepsCompleted,
      variant: params.variant,
    });
  }

  async trackPaywallViewed(params: {
    sessionId: string;
    stepId: string;
    paywallId?: string;
    paywallTemplate: string;
    variant?: string;
    experiment?: RuntimeExperimentContext;
  }): Promise<void> {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    await this.track({
      type: "paywall_viewed",
      flowId: this.options.flowId,
      sessionId: params.sessionId,
      userId: this.userId,
      stepId: params.stepId,
      paywallId: params.paywallId,
      paywallTemplate: params.paywallTemplate,
      variant: params.variant,
    }, params.experiment);
  }

  async trackPaywallPackageSelected(params: {
    sessionId: string;
    stepId: string;
    paywallId?: string;
    paywallTemplate: string;
    packageId: string;
    productId?: string;
    variant?: string;
    experiment?: RuntimeExperimentContext;
  }): Promise<void> {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    await this.track({
      type: "paywall_package_selected",
      flowId: this.options.flowId,
      sessionId: params.sessionId,
      userId: this.userId,
      stepId: params.stepId,
      paywallId: params.paywallId,
      paywallTemplate: params.paywallTemplate,
      packageId: params.packageId,
      productId: params.productId,
      variant: params.variant,
    }, params.experiment);
  }

  async trackPaywallPurchaseStarted(params: {
    sessionId: string;
    stepId: string;
    paywallId?: string;
    paywallTemplate: string;
    packageId?: string;
    productId?: string;
    variant?: string;
    experiment?: RuntimeExperimentContext;
  }): Promise<void> {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    await this.track({
      type: "paywall_purchase_started",
      flowId: this.options.flowId,
      sessionId: params.sessionId,
      userId: this.userId,
      stepId: params.stepId,
      paywallId: params.paywallId,
      paywallTemplate: params.paywallTemplate,
      packageId: params.packageId,
      productId: params.productId,
      variant: params.variant,
    }, params.experiment);
  }

  async trackPaywallTrialStarted(params: {
    sessionId: string;
    stepId: string;
    paywallId?: string;
    paywallTemplate: string;
    packageId?: string;
    productId?: string;
    trialPeriod?: string;
    variant?: string;
    experiment?: RuntimeExperimentContext;
  }): Promise<void> {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    await this.track({
      type: "paywall_trial_started",
      flowId: this.options.flowId,
      sessionId: params.sessionId,
      userId: this.userId,
      stepId: params.stepId,
      paywallId: params.paywallId,
      paywallTemplate: params.paywallTemplate,
      packageId: params.packageId,
      productId: params.productId,
      trialPeriod: params.trialPeriod,
      variant: params.variant,
    }, params.experiment);
  }

  async trackPaywallPurchaseFailed(params: {
    sessionId: string;
    stepId: string;
    paywallId?: string;
    paywallTemplate: string;
    reason: "cancelled" | "error" | "pending";
    packageId?: string;
    productId?: string;
    message?: string;
    variant?: string;
    experiment?: RuntimeExperimentContext;
  }): Promise<void> {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    await this.track({
      type: "paywall_purchase_failed",
      flowId: this.options.flowId,
      sessionId: params.sessionId,
      userId: this.userId,
      stepId: params.stepId,
      paywallId: params.paywallId,
      paywallTemplate: params.paywallTemplate,
      reason: params.reason,
      packageId: params.packageId,
      productId: params.productId,
      message: params.message,
      variant: params.variant,
    }, params.experiment);
  }

  async trackPaywallConverted(params: {
    sessionId: string;
    stepId: string;
    paywallId?: string;
    paywallTemplate: string;
    productId: string;
    priceUsd?: number;
    variant?: string;
    experiment?: RuntimeExperimentContext;
  }): Promise<void> {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    await this.track({
      type: "paywall_converted",
      flowId: this.options.flowId,
      sessionId: params.sessionId,
      userId: this.userId,
      stepId: params.stepId,
      paywallId: params.paywallId,
      paywallTemplate: params.paywallTemplate,
      productId: params.productId,
      priceUsd: params.priceUsd,
      variant: params.variant,
    }, params.experiment);
  }

  async trackPaywallDismissed(params: {
    sessionId: string;
    stepId: string;
    paywallId?: string;
    paywallTemplate: string;
    timeSpentMs: number;
    experiment?: RuntimeExperimentContext;
  }): Promise<void> {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    await this.track({
      type: "paywall_dismissed",
      flowId: this.options.flowId,
      sessionId: params.sessionId,
      userId: this.userId,
      stepId: params.stepId,
      paywallId: params.paywallId,
      paywallTemplate: params.paywallTemplate,
      timeSpentMs: params.timeSpentMs,
    }, params.experiment);
  }

  async trackPaywallRestoreStarted(params: {
    sessionId: string;
    stepId: string;
    paywallId?: string;
    paywallTemplate: string;
    variant?: string;
    experiment?: RuntimeExperimentContext;
  }): Promise<void> {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    await this.track({
      type: "paywall_restore_started",
      flowId: this.options.flowId,
      sessionId: params.sessionId,
      userId: this.userId,
      stepId: params.stepId,
      paywallId: params.paywallId,
      paywallTemplate: params.paywallTemplate,
      variant: params.variant,
    }, params.experiment);
  }

  async trackPaywallRestoreCompleted(params: {
    sessionId: string;
    stepId: string;
    paywallId?: string;
    paywallTemplate: string;
    restored: boolean;
    variant?: string;
    experiment?: RuntimeExperimentContext;
  }): Promise<void> {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    await this.track({
      type: "paywall_restore_completed",
      flowId: this.options.flowId,
      sessionId: params.sessionId,
      userId: this.userId,
      stepId: params.stepId,
      paywallId: params.paywallId,
      paywallTemplate: params.paywallTemplate,
      restored: params.restored,
      variant: params.variant,
    }, params.experiment);
  }

  async trackPaywallRestoreFailed(params: {
    sessionId: string;
    stepId: string;
    paywallId?: string;
    paywallTemplate: string;
    message?: string;
    variant?: string;
    experiment?: RuntimeExperimentContext;
  }): Promise<void> {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    await this.track({
      type: "paywall_restore_failed",
      flowId: this.options.flowId,
      sessionId: params.sessionId,
      userId: this.userId,
      stepId: params.stepId,
      paywallId: params.paywallId,
      paywallTemplate: params.paywallTemplate,
      message: params.message,
      variant: params.variant,
    }, params.experiment);
  }

  async trackPaywallLinkPressed(params: {
    sessionId: string;
    stepId: string;
    paywallId?: string;
    paywallTemplate: string;
    url: string;
    label?: string;
    variant?: string;
    experiment?: RuntimeExperimentContext;
  }): Promise<void> {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    await this.track({
      type: "paywall_link_pressed",
      flowId: this.options.flowId,
      sessionId: params.sessionId,
      userId: this.userId,
      stepId: params.stepId,
      paywallId: params.paywallId,
      paywallTemplate: params.paywallTemplate,
      url: params.url,
      label: params.label,
      variant: params.variant,
    }, params.experiment);
  }

  async flushEvents(): Promise<void> {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    await this.analytics.flush();
  }

  startAutoFlush(intervalMs = 10_000): void {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    void intervalMs;
    this.analytics.startAutoFlush();
  }

  stopAutoFlush(): void {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    this.analytics.stopAutoFlush();
  }

  private flowFetchOptionsFromConfig(
    options: ConversionFlowClientOptions,
  ): FlowFetchOptions {
    return {
      flowId: options.flowId,
      apiKey: options.apiKey,
      userId: this.userId,
      locale: options.locale,
      platform: options.platform,
      country: options.country,
      appVersion: options.appVersion,
      userType: options.userType,
      fetchImpl: options.fetchImpl,
    };
  }

  private paywallFetchOptionsFromConfig(
    options: ConversionFlowClientOptions,
    paywallId: string,
  ): PaywallFetchOptions {
    return {
      paywallId,
      apiKey: options.apiKey,
      userId: this.userId,
      locale: options.locale,
      platform: options.platform,
      country: options.country,
      appVersion: options.appVersion,
      userType: options.userType,
      fetchImpl: options.fetchImpl,
    };
  }

  private offeringFetchOptionsFromConfig(
    options: ConversionFlowClientOptions,
    offeringId: string,
  ): OfferingFetchOptions {
    return {
      offeringId,
      apiKey: options.apiKey,
      userId: this.userId,
      locale: options.locale,
      platform: options.platform,
      country: options.country,
      appVersion: options.appVersion,
      fetchImpl: options.fetchImpl,
    };
  }

  private purchaseRequestOptionsFromConfig(
    options: ConversionFlowClientOptions,
  ): PurchaseRequestOptions {
    return {
      apiKey: options.apiKey,
      fetchImpl: options.fetchImpl,
    };
  }

  private customerEntitlementsFetchOptionsFromConfig(
    options: ConversionFlowClientOptions,
  ): CustomerEntitlementsFetchOptions {
    return {
      apiKey: options.apiKey,
      fetchImpl: options.fetchImpl,
    };
  }

  private analyticsOptionsFromConfig(
    options: ConversionFlowClientOptions,
  ): AnalyticsClientOptions {
    return {
      apiKey: options.apiKey,
      appId: options.appId ?? "onborn.app",
      platform: options.platform ?? inferPlatform(),
      locale: options.locale,
      country: options.country,
      userType: options.userType,
      appVersion: options.appVersion ?? "0.0.0",
      sdkVersion: options.sdkVersion ?? "0.1.0",
      storage: defaultAnalyticsStorage,
      maxQueueSize: options.maxAnalyticsQueueSize,
      autoFlushMs: options.autoFlushMs,
      fetchImpl: options.fetchImpl,
    };
  }

  private async track(
    input: TrackEventInput,
    experimentOverride?: RuntimeExperimentContext | null,
  ): Promise<void> {
    await this.analytics.track(
      this.withExperimentContext(input, experimentOverride),
    );
  }

  private withExperimentContext(
    input: TrackEventInput,
    experimentOverride?: RuntimeExperimentContext | null,
  ): TrackEventInput {
    const experiment =
      experimentOverride === undefined
        ? this.experimentContext
        : experimentOverride;
    if (!experiment) {
      return input;
    }
    return {
      ...input,
      experimentId: experiment.id,
      experimentVariantId: experiment.variantId,
      experimentAssignmentId: experiment.assignmentId,
    } as TrackEventInput;
  }

  /**
   * Sends one telemetry signal per runtime/user+flow key so the dashboard can
   * detect that the app was connected with the SDK at least once.
   */
  private async trackSdkConnectionEstablished(): Promise<void> {
    const signalKey = `${this.options.apiKey}:${this.options.flowId}:${this.userId}`;
    if (this.sdkConnectionTracked || sentConnectionSignals.has(signalKey)) {
      return;
    }

    try {
      await this.track({
        type: "sdk_connection_established",
        flowId: this.options.flowId,
        sessionId: `sdk-connection:${this.options.flowId}`,
        userId: this.userId,
      });
      await this.analytics.flush();
      this.sdkConnectionTracked = true;
      sentConnectionSignals.add(signalKey);
    } catch {
      // Best effort only: failing telemetry must not block SDK usage.
    }
  }
}

export function createInternalClient(
  options: ConversionFlowClientOptions,
): ConversionFlowClient {
  return new ConversionFlowClient(options);
}

function createAnonymousUserId(): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `anon-${Date.now()}-${randomPart}`;
}

function inferPlatform(): "ios" | "android" {
  const userAgent = globalThis.navigator?.userAgent?.toLowerCase() ?? "";
  return userAgent.includes("android") ? "android" : "ios";
}
