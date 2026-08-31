import type {
  BillingOffering,
  BillingPlatform,
  BillingPackage,
  BillingProduct,
  CustomerEntitlement,
  GetOfferingResponse,
  NativeStoreRestoredPurchase,
  PurchaseStatus,
} from "@onborn/sdk-contracts";

export type { CustomerEntitlement } from "@onborn/sdk-contracts";

export type OnbornPackageWithProduct = {
  package: BillingPackage;
  product?: BillingProduct;
};

export type OnbornPurchaseInput = {
  /** The paywall screen the purchase started from, for attribution. */
  paywallId?: string;
  offering: BillingOffering;
  package: BillingPackage;
  product?: BillingProduct;
  userId?: string;
};

export type OnbornPurchaseResult = {
  success: boolean;
  status?: PurchaseStatus;
  purchaseId?: string;
  transactionId?: string;
  purchaseToken?: string;
  receipt?: string;
  productId?: string;
  packageId?: string;
  entitlementIds?: string[];
  activeProductIds?: string[];
  entitlements?: CustomerEntitlement[];
  raw?: unknown;
};

export type OnbornRestoreInput = {
  paywallId?: string;
  offering?: BillingOffering;
  products: BillingProduct[];
  userId?: string;
};

export type OnbornLoadProductsInput = {
  paywallId?: string;
  offering?: BillingOffering;
  products: BillingProduct[];
  userId?: string;
};

export type OnbornRestoreResult = {
  success: boolean;
  status?: PurchaseStatus;
  purchaseId?: string;
  entitlementIds?: string[];
  activeProductIds?: string[];
  purchases?: NativeStoreRestoredPurchase[];
  entitlements?: CustomerEntitlement[];
  raw?: unknown;
};

export type OnbornBillingAdapter = {
  loadProducts?: (input: OnbornLoadProductsInput) => Promise<BillingProduct[]>;
  purchasePackage: (
    input: OnbornPurchaseInput,
  ) => Promise<OnbornPurchaseResult>;
  /**
   * Completes a native transaction after Onborn validates it. Implementations
   * should be idempotent because unfinished store transactions may be replayed.
   */
  finalizePurchase?: (result: OnbornPurchaseResult) => Promise<void>;
  restorePurchases?: (
    input: OnbornRestoreInput,
  ) => Promise<OnbornRestoreResult>;
  /** Completes restored native transactions after Onborn reconciles them. */
  finalizeRestore?: (result: OnbornRestoreResult) => Promise<void>;
  refetchCustomerEntitlements?: (input: {
    userId?: string;
  }) => Promise<OnbornRestoreResult>;
};

export type OnbornPaywallRuntimeContext = {
  paywallId?: string;
  offering?: BillingOffering;
  products?: BillingProduct[];
  platform?: BillingPlatform;
  presentationMode?: "standalone" | "flow";
  selectedPackageId?: string;
  onSelectPackage?: (packageId: string) => void;
  onPurchaseSelectedPackage?: () => void;
  onRestorePurchases?: () => void;
  onDismissPaywall?: () => void;
  onLinkPress?: (link: { url: string; label?: string }) => void;
  purchasing?: boolean;
  restoring?: boolean;
};

export type OnbornOfferingData = GetOfferingResponse;
