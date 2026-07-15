import {
  type TrackEventInput,
} from "@onborn/analytics";
import { BillingClient } from "@onborn/billing";
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
import { Onborn } from "../config/Onborn";
import {
  fetchFlowConfig,
  type FlowFetchOptions,
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
  private readonly emitAnalyticsEvents: boolean;
  private readonly billingClient: BillingClient;
  private experimentContext: RuntimeExperimentContext | null = null;
  private sdkConnectionTracked = false;

  constructor(options: ConversionFlowClientOptions) {
    this.options = {
      ...options,
      locale: resolveRuntimeLocale(options.locale),
    };
    this.userId = options.userId ?? createAnonymousUserId();
    this.emitAnalyticsEvents = options.emitAnalyticsEvents !== false;
    this.billingClient = new BillingClient({
      sourceId: this.options.flowId,
    });
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
    return this.billingClient.loadPaywall(paywallId);
  }

  async loadOffering(): Promise<GetOfferingResponse> {
    return this.billingClient.loadOffering();
  }

  async validatePurchase(
    input: Omit<ValidatePurchaseRequest, "userId">,
  ): Promise<PurchaseValidationResponse> {
    return this.billingClient.validatePurchase(input);
  }

  async restorePurchases(
    input: Omit<RestorePurchasesRequest, "userId">,
  ): Promise<PurchaseValidationResponse> {
    return this.billingClient.restorePurchases(input);
  }

  async loadCustomerEntitlements(): Promise<CustomerEntitlementsResponse> {
    return this.billingClient.loadCustomerEntitlements();
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
    await Onborn.flush();
  }

  startAutoFlush(): void {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    Onborn.startAutoFlush();
  }

  stopAutoFlush(): void {
    if (!this.emitAnalyticsEvents) {
      return;
    }
    Onborn.stopAutoFlush();
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

  private async track(
    input: TrackEventInput,
    experimentOverride?: RuntimeExperimentContext | null,
  ): Promise<void> {
    await Onborn.track(
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
      await Onborn.flush();
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
