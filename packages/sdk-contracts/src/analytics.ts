import { z } from "zod";

export const BaseEventSchema = z.object({
  eventId: z.string().uuid(),
  flowId: z.string(),
  sessionId: z.string(),
  userId: z.string(),
  appId: z.string(),
  timestamp: z.number(),
  platform: z.enum(["ios", "android"]),
  locale: z.string().optional(),
  country: z.string().optional(),
  userType: z.enum(["new", "returning"]).optional(),
  appVersion: z.string(),
  sdkVersion: z.string(),
  experimentId: z.string().optional(),
  experimentVariantId: z.string().optional(),
  experimentAssignmentId: z.string().optional(),
});

export const FlowStartedEventSchema = BaseEventSchema.extend({
  type: z.literal("flow_started"),
  variant: z.string().optional(),
});

export const StepViewedEventSchema = BaseEventSchema.extend({
  type: z.literal("step_viewed"),
  stepId: z.string(),
  stepType: z.string(),
  stepIndex: z.number(),
});

export const StepCompletedEventSchema = BaseEventSchema.extend({
  type: z.literal("step_completed"),
  stepId: z.string(),
  stepType: z.string(),
  stepIndex: z.number(),
  timeSpentMs: z.number(),
  answer: z.unknown().optional(),
});

export const StepSkippedEventSchema = BaseEventSchema.extend({
  type: z.literal("step_skipped"),
  stepId: z.string(),
  stepIndex: z.number(),
});

export const FlowCompletedEventSchema = BaseEventSchema.extend({
  type: z.literal("flow_completed"),
  totalTimeMs: z.number(),
  stepsCompleted: z.number(),
  variant: z.string().optional(),
});

export const PaywallViewedEventSchema = BaseEventSchema.extend({
  type: z.literal("paywall_viewed"),
  stepId: z.string(),
  paywallId: z.string().optional(),
  paywallTemplate: z.string(),
  variant: z.string().optional(),
});

export const PaywallPackageSelectedEventSchema = BaseEventSchema.extend({
  type: z.literal("paywall_package_selected"),
  stepId: z.string(),
  paywallId: z.string().optional(),
  paywallTemplate: z.string(),
  packageId: z.string(),
  productId: z.string().optional(),
  variant: z.string().optional(),
});

export const PaywallPurchaseStartedEventSchema = BaseEventSchema.extend({
  type: z.literal("paywall_purchase_started"),
  stepId: z.string(),
  paywallId: z.string().optional(),
  paywallTemplate: z.string(),
  packageId: z.string().optional(),
  productId: z.string().optional(),
  variant: z.string().optional(),
});

export const PaywallTrialStartedEventSchema = BaseEventSchema.extend({
  type: z.literal("paywall_trial_started"),
  stepId: z.string(),
  paywallId: z.string().optional(),
  paywallTemplate: z.string(),
  packageId: z.string().optional(),
  productId: z.string().optional(),
  trialPeriod: z.string().optional(),
  variant: z.string().optional(),
});

export const PaywallPurchaseFailedEventSchema = BaseEventSchema.extend({
  type: z.literal("paywall_purchase_failed"),
  stepId: z.string(),
  paywallId: z.string().optional(),
  paywallTemplate: z.string(),
  reason: z.enum(["cancelled", "error", "pending"]),
  packageId: z.string().optional(),
  productId: z.string().optional(),
  message: z.string().optional(),
  variant: z.string().optional(),
});

export const PaywallConvertedEventSchema = BaseEventSchema.extend({
  type: z.literal("paywall_converted"),
  stepId: z.string(),
  paywallId: z.string().optional(),
  paywallTemplate: z.string(),
  productId: z.string(),
  priceUsd: z.number().optional(),
  variant: z.string().optional(),
});

export const PaywallDismissedEventSchema = BaseEventSchema.extend({
  type: z.literal("paywall_dismissed"),
  stepId: z.string(),
  paywallId: z.string().optional(),
  paywallTemplate: z.string(),
  timeSpentMs: z.number(),
});

export const PaywallRestoreStartedEventSchema = BaseEventSchema.extend({
  type: z.literal("paywall_restore_started"),
  stepId: z.string(),
  paywallId: z.string().optional(),
  paywallTemplate: z.string(),
  variant: z.string().optional(),
});

export const PaywallRestoreCompletedEventSchema = BaseEventSchema.extend({
  type: z.literal("paywall_restore_completed"),
  stepId: z.string(),
  paywallId: z.string().optional(),
  paywallTemplate: z.string(),
  restored: z.boolean(),
  variant: z.string().optional(),
});

export const PaywallRestoreFailedEventSchema = BaseEventSchema.extend({
  type: z.literal("paywall_restore_failed"),
  stepId: z.string(),
  paywallId: z.string().optional(),
  paywallTemplate: z.string(),
  message: z.string().optional(),
  variant: z.string().optional(),
});

export const PaywallLinkPressedEventSchema = BaseEventSchema.extend({
  type: z.literal("paywall_link_pressed"),
  stepId: z.string(),
  paywallId: z.string().optional(),
  paywallTemplate: z.string(),
  url: z.string(),
  label: z.string().optional(),
  variant: z.string().optional(),
});

export const SdkConnectionEstablishedEventSchema = BaseEventSchema.extend({
  type: z.literal("sdk_connection_established"),
});

export const AnalyticsEventSchema = z.discriminatedUnion("type", [
  FlowStartedEventSchema,
  StepViewedEventSchema,
  StepCompletedEventSchema,
  StepSkippedEventSchema,
  FlowCompletedEventSchema,
  PaywallViewedEventSchema,
  PaywallPackageSelectedEventSchema,
  PaywallPurchaseStartedEventSchema,
  PaywallTrialStartedEventSchema,
  PaywallPurchaseFailedEventSchema,
  PaywallConvertedEventSchema,
  PaywallDismissedEventSchema,
  PaywallRestoreStartedEventSchema,
  PaywallRestoreCompletedEventSchema,
  PaywallRestoreFailedEventSchema,
  PaywallLinkPressedEventSchema,
  SdkConnectionEstablishedEventSchema,
]);

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
