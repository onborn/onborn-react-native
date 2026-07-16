import { z } from "zod";
import { RuntimeExperimentAssignmentSchema } from "./experiment";
import { LayoutConfigSchema } from "./layout";
import type { FlowTheme } from "./theme";
import {
  AnimatedAssetPrimitiveSchema,
  BadgePrimitiveSchema,
  CarouselPaginationPrimitiveSchema,
  CarouselPrimitiveSchema,
  CTAButtonPrimitiveSchema,
  IconPrimitiveSchema,
  ImagePrimitiveSchema,
  SubtitlePrimitiveSchema,
  TestimonialCardPrimitiveSchema,
  TextFontFamilySchema,
  TitlePrimitiveSchema,
  XStackPrimitiveSchema,
  YStackPrimitiveSchema,
} from "./primitives";
import { FlowThemeSchema } from "./theme";
import { FlowTranslationsSchema } from "./translations";
import {
  PaywallFeatureListPrimitiveSchema,
  PaywallLegalTextPrimitiveSchema,
  PaywallCloseButtonPrimitiveSchema,
  PaywallPackageCardPrimitiveSchema,
  PaywallPackageListPrimitiveSchema,
  PaywallPackageSelectorPrimitiveSchema,
  PaywallPriceTextPrimitiveSchema,
  PaywallRestorePurchasesButtonPrimitiveSchema,
  PaywallTermsLinksPrimitiveSchema,
  PaywallTrialTextPrimitiveSchema,
} from "./paywall-primitives";

export {
  migratePaywallPrimitiveEntry,
  normalizePackageSelectorProps,
  isDeprecatedPaywallPackagePrimitiveType,
} from "./paywall-primitives";
export type {
  NormalizedPackageSelectorProps,
  PackageSelectorLayout,
  PaywallTermsLink,
} from "./paywall-primitives";

export const BillingEnvironmentSchema = z.enum(["test", "prod"]);

export const BillingProviderSchema = z.enum(["native_stores", "revenuecat"]);

export const BillingStoreSchema = z.enum([
  "app_store",
  "google_play",
  "revenuecat_custom",
]);

export const BillingProductTypeSchema = z.enum([
  "subscription",
  "one_time",
  "consumable",
]);

export const BillingProductSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    environment: BillingEnvironmentSchema,
    provider: BillingProviderSchema,
    store: BillingStoreSchema,
    storeProductId: z.string().min(1),
    type: BillingProductTypeSchema,
    title: z.string().optional(),
    description: z.string().optional(),
    price: z.string().optional(),
    currency: z.string().optional(),
    period: z.string().optional(),
    trialPeriod: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    syncedAt: z.string().optional(),
  })
  .strict();

export const BillingEntitlementSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    environment: BillingEnvironmentSchema,
    key: z.string().min(1),
    label: z.string().min(1),
    description: z.string().optional(),
  })
  .strict();

export const BillingPackageStoreProductIdsSchema = z
  .object({
    app_store: z.string().min(1).optional(),
    google_play: z.string().min(1).optional(),
    revenuecat_custom: z.string().min(1).optional(),
  })
  .strict();

export const BillingPackageSchema = z
  .object({
    id: z.string().min(1),
    productId: z.string().min(1),
    productIdsByStore: BillingPackageStoreProductIdsSchema.optional(),
    label: z.string().optional(),
    badge: z.string().optional(),
    description: z.string().optional(),
    isHighlighted: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const BillingOfferingSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    environment: BillingEnvironmentSchema,
    provider: BillingProviderSchema,
    key: z.string().min(1),
    label: z.string().min(1),
    entitlementId: z.string().min(1),
    defaultPackageId: z.string().min(1).optional(),
    providerOfferingId: z.string().optional(),
    packages: z.array(BillingPackageSchema).default([]),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .superRefine((offering, ctx) => {
    if (!offering.defaultPackageId) {
      return;
    }
    if (
      !offering.packages.some((item) => item.id === offering.defaultPackageId)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["defaultPackageId"],
        message: "defaultPackageId must reference one of offering packages",
      });
    }
  });

export const BillingRuntimeConfigSchema = z
  .object({
    provider: BillingProviderSchema,
    revenueCat: z
      .object({
        iosSdkKey: z.string().min(1).optional(),
        androidSdkKey: z.string().min(1).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const PaywallPrimitiveSchema = z.union([
  TitlePrimitiveSchema,
  SubtitlePrimitiveSchema,
  ImagePrimitiveSchema,
  AnimatedAssetPrimitiveSchema,
  CarouselPrimitiveSchema,
  CarouselPaginationPrimitiveSchema,
  TestimonialCardPrimitiveSchema,
  BadgePrimitiveSchema,
  IconPrimitiveSchema,
  CTAButtonPrimitiveSchema,
  XStackPrimitiveSchema,
  YStackPrimitiveSchema,
  PaywallPackageSelectorPrimitiveSchema,
  PaywallPackageCardPrimitiveSchema,
  PaywallPackageListPrimitiveSchema,
  PaywallPriceTextPrimitiveSchema,
  PaywallTrialTextPrimitiveSchema,
  PaywallFeatureListPrimitiveSchema,
  PaywallRestorePurchasesButtonPrimitiveSchema,
  PaywallCloseButtonPrimitiveSchema,
  PaywallLegalTextPrimitiveSchema,
  PaywallTermsLinksPrimitiveSchema,
]);

export const PaywallPrimitivesSchema = z.record(
  z.string(),
  PaywallPrimitiveSchema,
);

export const PAYWALL_LAYOUT_PRESET_VALUES = [
  "content_focused",
  "hero",
  "hero_sheet",
  "split",
] as const;

export const PaywallLayoutPresetSchema = z.enum(
  PAYWALL_LAYOUT_PRESET_VALUES,
);

export const PaywallLayoutConfigSchema = z
  .object({
    preset: PaywallLayoutPresetSchema.optional(),
    bg: LayoutConfigSchema.shape.bg,
    fontFamily: TextFontFamilySchema.optional(),
    safeArea: z.boolean().optional(),
  })
  .strict();

export const PaywallStepSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    type: z.literal("paywall"),
    layout: PaywallLayoutConfigSchema.extend({
      preset: PaywallLayoutPresetSchema,
    }).strict(),
    primitives: PaywallPrimitivesSchema,
  })
  .strict();

export const PaywallStatusSchema = z.enum(["draft", "published"]);

export const PaywallConfigSchema = z
  .object({
    id: z.string().min(1),
    flowId: z.string().min(1).optional(),
    version: z.number().int().min(1),
    name: z.string().min(1),
    environment: BillingEnvironmentSchema,
    offeringId: z.string().min(1).optional(),
    layout: PaywallLayoutConfigSchema.optional(),
    theme: FlowThemeSchema.optional(),
    translations: FlowTranslationsSchema.optional(),
    primitives: PaywallPrimitivesSchema.default({}),
    status: PaywallStatusSchema.optional(),
  })
  .strict();

export const PaywallPlacementSchema = z
  .object({
    id: z.string().min(1),
    flowId: z.string().min(1),
    paywallId: z.string().min(1),
    environment: BillingEnvironmentSchema,
    placement: z.enum(["after_step", "manual_step", "flow_end"]),
    stepId: z.string().min(1).optional(),
    trigger: z.string().optional(),
  })
  .strict()
  .superRefine((placement, ctx) => {
    if (placement.placement === "after_step" && !placement.stepId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stepId"],
        message: "stepId is required for after_step paywall placement",
      });
    }
  });

export const GetPaywallResponseSchema = z.object({
  paywall: PaywallConfigSchema,
  offering: BillingOfferingSchema.optional(),
  products: z.array(BillingProductSchema).default([]),
  billing: BillingRuntimeConfigSchema.optional(),
  experiment: RuntimeExperimentAssignmentSchema.optional(),
});

export const GetOfferingResponseSchema = z.object({
  offering: BillingOfferingSchema,
  products: z.array(BillingProductSchema).default([]),
  billing: BillingRuntimeConfigSchema.optional(),
});

export const PurchaseStatusSchema = z.enum([
  "pending",
  "validated",
  "rejected",
]);

export const CustomerEntitlementSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    environment: BillingEnvironmentSchema,
    userId: z.string().min(1),
    entitlementId: z.string().min(1),
    key: z.string().min(1),
    label: z.string().min(1),
    active: z.boolean(),
    sourcePurchaseId: z.string().optional(),
    expiresAt: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const ValidatePurchaseRequestSchema = z
  .object({
    idempotencyKey: z.string().trim().min(1).max(240),
    userId: z.string().trim().min(1).max(240).optional(),
    paywallId: z.string().trim().min(1).optional(),
    offeringId: z.string().trim().min(1),
    packageId: z.string().trim().min(1),
    productId: z.string().trim().min(1).optional(),
    storeProductId: z.string().trim().min(1),
    provider: BillingProviderSchema,
    store: BillingStoreSchema,
    transactionId: z.string().trim().min(1).max(500).optional(),
    purchaseToken: z.string().trim().min(1).max(64_000).optional(),
    receipt: z.string().trim().min(1).max(20000).optional(),
    raw: z.unknown().optional(),
  })
  .strict();

export const NativeStoreRestoredPurchaseSchema = z
  .object({
    store: z.enum(["app_store", "google_play"]),
    storeProductId: z.string().trim().min(1).max(500),
    transactionId: z.string().trim().min(1).max(500).optional(),
    purchaseToken: z.string().trim().min(1).max(64_000).optional(),
    raw: z.unknown().optional(),
  })
  .strict();

export const RestorePurchasesRequestSchema = z
  .object({
    idempotencyKey: z.string().trim().min(1).max(240),
    userId: z.string().trim().min(1).max(240).optional(),
    provider: BillingProviderSchema.optional(),
    activeEntitlementKeys: z
      .array(z.string().trim().min(1).max(240))
      .max(100)
      .optional(),
    activeProductIds: z
      .array(z.string().trim().min(1).max(240))
      .max(200)
      .optional(),
    purchases: z.array(NativeStoreRestoredPurchaseSchema).max(200).optional(),
    raw: z.unknown().optional(),
  })
  .strict();

export const PurchaseValidationResponseSchema = z
  .object({
    purchaseId: z.string().min(1),
    status: PurchaseStatusSchema,
    entitlements: z.array(CustomerEntitlementSchema).default([]),
  })
  .strict();

export const CustomerEntitlementsResponseSchema = z
  .object({
    entitlements: z.array(CustomerEntitlementSchema).default([]),
  })
  .strict();

export type BillingEnvironment = z.infer<typeof BillingEnvironmentSchema>;
export type BillingProvider = z.infer<typeof BillingProviderSchema>;
export type BillingStore = z.infer<typeof BillingStoreSchema>;
export type BillingProductType = z.infer<typeof BillingProductTypeSchema>;
export type BillingProduct = z.infer<typeof BillingProductSchema>;
export type BillingEntitlement = z.infer<typeof BillingEntitlementSchema>;
export type BillingPackage = z.infer<typeof BillingPackageSchema>;
export type BillingOffering = z.infer<typeof BillingOfferingSchema>;
export type BillingRuntimeConfig = z.infer<typeof BillingRuntimeConfigSchema>;
export type PaywallPrimitive = z.infer<typeof PaywallPrimitiveSchema>;
export type PaywallPrimitives = z.infer<typeof PaywallPrimitivesSchema>;
export type PaywallStep = z.infer<typeof PaywallStepSchema>;
export type PaywallStatus = z.infer<typeof PaywallStatusSchema>;
export type PaywallConfig = z.infer<typeof PaywallConfigSchema>;
export type PaywallPlacement = z.infer<typeof PaywallPlacementSchema>;

/** Step ids for paywall screens injected into a flow or opened standalone. */
export function isPaywallStepId(stepId: string): boolean {
  return stepId.startsWith("paywall:");
}

/** Funnel theme with paywall-specific overrides (colors, fonts, buttons, components). */
export function mergePaywallFlowTheme(
  funnelTheme: FlowTheme | undefined,
  paywallTheme: FlowTheme | undefined,
): FlowTheme | undefined {
  if (!funnelTheme && !paywallTheme) {
    return undefined;
  }
  return {
    colors: { ...funnelTheme?.colors, ...paywallTheme?.colors },
    fonts: { ...funnelTheme?.fonts, ...paywallTheme?.fonts },
    buttons: paywallTheme?.buttons ?? funnelTheme?.buttons,
    components: { ...funnelTheme?.components, ...paywallTheme?.components },
  };
}
export type GetPaywallResponse = z.infer<typeof GetPaywallResponseSchema>;
export type GetOfferingResponse = z.infer<typeof GetOfferingResponseSchema>;
export type PurchaseStatus = z.infer<typeof PurchaseStatusSchema>;
export type CustomerEntitlement = z.infer<typeof CustomerEntitlementSchema>;
export type ValidatePurchaseRequest = z.infer<
  typeof ValidatePurchaseRequestSchema
>;
export type RestorePurchasesRequest = z.infer<
  typeof RestorePurchasesRequestSchema
>;
export type NativeStoreRestoredPurchase = z.infer<
  typeof NativeStoreRestoredPurchaseSchema
>;
export type PurchaseValidationResponse = z.infer<
  typeof PurchaseValidationResponseSchema
>;
export type CustomerEntitlementsResponse = z.infer<
  typeof CustomerEntitlementsResponseSchema
>;

export type BillingPackageStoreProductIds = z.infer<
  typeof BillingPackageStoreProductIdsSchema
>;

export type BillingPlatform = "ios" | "android" | "web";

export type BillingPackageProductRefs = {
  productId: string;
  productIdsByStore?: BillingPackageStoreProductIds;
  metadata?: Record<string, unknown>;
};

export function readPackageProductIdsByStore(
  pkg: BillingPackageProductRefs,
): BillingPackageStoreProductIds {
  if (pkg.productIdsByStore) {
    return pkg.productIdsByStore;
  }
  const raw = pkg.metadata?.productIdsByStore;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return BillingPackageStoreProductIdsSchema.parse(raw);
  }
  return {};
}

export function collectPackageProductIds(
  pkg: BillingPackageProductRefs,
): string[] {
  const ids = new Set<string>([pkg.productId]);
  for (const productId of Object.values(readPackageProductIdsByStore(pkg))) {
    if (productId) {
      ids.add(productId);
    }
  }
  return [...ids];
}

export function platformToBillingStore(
  platform: BillingPlatform | undefined,
): BillingStore | undefined {
  if (platform === "ios") {
    return "app_store";
  }
  if (platform === "android") {
    return "google_play";
  }
  return undefined;
}

export function resolvePackageProductIdForStore(
  pkg: BillingPackageProductRefs,
  store: BillingStore,
): string {
  const byStore = readPackageProductIdsByStore(pkg);
  return byStore[store] ?? pkg.productId;
}

export function resolvePackageProductId(
  pkg: BillingPackageProductRefs,
  platform?: BillingPlatform,
): string {
  const store = platformToBillingStore(platform);
  if (store) {
    const byStore = readPackageProductIdsByStore(pkg);
    if (byStore[store]) {
      return byStore[store]!;
    }
  }
  return pkg.productId;
}
