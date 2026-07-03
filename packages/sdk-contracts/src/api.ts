import { z } from "zod";
import {
  GetOfferingResponseSchema,
  GetPaywallResponseSchema,
  CustomerEntitlementsResponseSchema,
  PurchaseValidationResponseSchema,
  PaywallPlacementSchema,
} from "./paywall";
import { RuntimeExperimentAssignmentSchema } from "./experiment";

export const GetFlowResponseSchema = z.object({
  config: z.unknown(),
  experiment: RuntimeExperimentAssignmentSchema.optional(),
  paywalls: z
    .array(
      GetPaywallResponseSchema.extend({
        placement: PaywallPlacementSchema,
      }),
    )
    .default([]),
});

export const BatchEventsRequestSchema = z.object({
  events: z.array(z.unknown()).min(1).max(200),
});

export const BatchEventsResponseSchema = z.object({
  received: z.number(),
  failed: z.number(),
});

export const FlowAnalyticsResponseSchema = z.object({
  flowId: z.string(),
  period: z.object({
    from: z.number(),
    to: z.number(),
  }),
  totalSessions: z.number(),
  completionRate: z.number(),
  paywallConversionRate: z.number(),
  steps: z.array(
    z.object({
      stepId: z.string(),
      stepType: z.string(),
      stepIndex: z.number(),
      views: z.number(),
      completions: z.number(),
      dropoffRate: z.number(),
      avgTimeSpentMs: z.number(),
    }),
  ),
});

export const GetSdkPaywallResponseSchema = GetPaywallResponseSchema;
export const GetSdkOfferingResponseSchema = GetOfferingResponseSchema;
export const ValidateSdkPurchaseResponseSchema =
  PurchaseValidationResponseSchema;
export const RestoreSdkPurchasesResponseSchema = PurchaseValidationResponseSchema;
export const GetSdkCustomerEntitlementsResponseSchema =
  CustomerEntitlementsResponseSchema;

export type GetFlowResponse = z.infer<typeof GetFlowResponseSchema>;
export type BatchEventsRequest = z.infer<typeof BatchEventsRequestSchema>;
export type BatchEventsResponse = z.infer<typeof BatchEventsResponseSchema>;
export type FlowAnalyticsResponse = z.infer<typeof FlowAnalyticsResponseSchema>;
export type GetSdkPaywallResponse = z.infer<typeof GetSdkPaywallResponseSchema>;
export type GetSdkOfferingResponse = z.infer<
  typeof GetSdkOfferingResponseSchema
>;
export type ValidateSdkPurchaseResponse = z.infer<
  typeof ValidateSdkPurchaseResponseSchema
>;
export type RestoreSdkPurchasesResponse = z.infer<
  typeof RestoreSdkPurchasesResponseSchema
>;
export type GetSdkCustomerEntitlementsResponse = z.infer<
  typeof GetSdkCustomerEntitlementsResponseSchema
>;
