import type {
  BillingOffering,
  BillingPlatform,
  BillingPackage,
  BillingProduct,
  CustomerEntitlement,
  GetFlowResponse,
  GetOfferingResponse,
  GetPaywallResponse,
  NativeStoreRestoredPurchase,
  PaywallConfig,
  PurchaseStatus,
} from "@onborn/sdk-contracts";

export type { CustomerEntitlement } from "@onborn/sdk-contracts";

export type OnbornPackageWithProduct = {
  package: BillingPackage;
  product?: BillingProduct;
};

export type OnbornPurchaseInput = {
  paywall?: PaywallConfig;
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
  paywall?: PaywallConfig;
  offering?: BillingOffering;
  products: BillingProduct[];
  userId?: string;
};

export type OnbornLoadProductsInput = {
  paywall?: PaywallConfig;
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
  restorePurchases?: (
    input: OnbornRestoreInput,
  ) => Promise<OnbornRestoreResult>;
  refetchCustomerEntitlements?: (input: {
    userId?: string;
  }) => Promise<OnbornRestoreResult>;
};

export type OnbornPaywallRuntimeContext = {
  paywall?: PaywallConfig;
  offering?: BillingOffering;
  products?: BillingProduct[];
  platform?: BillingPlatform;
  presentationMode?: "standalone" | "flow";
  experiment?: NonNullable<GetFlowResponse["experiment"]>;
  selectedPackageId?: string;
  onSelectPackage?: (packageId: string) => void;
  onPurchaseSelectedPackage?: () => void;
  onRestorePurchases?: () => void;
  onDismissPaywall?: () => void;
  onLinkPress?: (link: { url: string; label?: string }) => void;
  purchasing?: boolean;
  restoring?: boolean;
};

export type OnbornPaywallData = GetPaywallResponse;
export type OnbornOfferingData = GetOfferingResponse;
