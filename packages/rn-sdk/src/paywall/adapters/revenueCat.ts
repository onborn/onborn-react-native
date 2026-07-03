import { Platform } from "react-native";
import type { BillingProduct, BillingRuntimeConfig } from "@onborn/sdk-contracts";
import type {
  OnbornBillingAdapter,
  OnbornLoadProductsInput,
  OnbornPurchaseInput,
  OnbornPurchaseResult,
  OnbornRestoreResult,
} from "../types";

type RevenueCatCustomerInfo = {
  originalAppUserId?: string;
  originalAppUserID?: string;
  entitlements?: {
    active?: Record<string, unknown>;
  };
  activeSubscriptions?: string[];
  allPurchasedProductIdentifiers?: string[];
  nonSubscriptionTransactions?: Array<{
    productIdentifier?: string;
    productId?: string;
  }>;
};

type RevenueCatStoreProduct = {
  identifier?: string;
  productIdentifier?: string;
  title?: string;
  description?: string;
  price?: number | string;
  priceString?: string;
  localizedPriceString?: string;
  currencyCode?: string;
  currency?: string;
  subscriptionPeriod?: string;
  period?: string;
  trialPeriod?: string;
  trialDuration?: string;
  trial_duration?: string;
  freeTrialPeriod?: string;
  introPrice?: {
    period?: string;
    subscriptionPeriod?: string;
  } | null;
  introductoryPrice?: {
    period?: string;
    subscriptionPeriod?: string;
  } | null;
};

type RevenueCatPackage = {
  identifier?: string;
  packageType?: string;
  product?: RevenueCatStoreProduct;
};

type RevenueCatOffering = {
  identifier?: string;
  availablePackages?: RevenueCatPackage[];
};

type RevenueCatOfferings = {
  current?: RevenueCatOffering | null;
  all?: Record<string, RevenueCatOffering | undefined>;
};

export type RevenueCatPurchasesModule = {
  configure?: (options: {
    apiKey: string;
    appUserID?: string;
  }) => void | Promise<void>;
  getOfferings: () => Promise<RevenueCatOfferings>;
  purchasePackage: (pkg: RevenueCatPackage) => Promise<{
    customerInfo?: RevenueCatCustomerInfo;
    productIdentifier?: string;
  }>;
  restorePurchases: () => Promise<RevenueCatCustomerInfo>;
  getCustomerInfo?: () => Promise<RevenueCatCustomerInfo>;
  logIn?: (appUserId: string) => Promise<{
    customerInfo?: RevenueCatCustomerInfo;
    created?: boolean;
  }>;
};

export type RevenueCatBillingAdapterOptions = {
  purchases: RevenueCatPurchasesModule;
  /**
   * Calls RevenueCat `logIn(userId)` before purchase/restore/refetch when the
   * method exists. Keep this on unless the host app configures RevenueCat with
   * the same appUserID before creating the adapter.
   */
  identifyUser?: boolean;
  resolvePackage?: (
    input: OnbornPurchaseInput,
    offerings: RevenueCatOfferings,
  ) => RevenueCatPackage | Promise<RevenueCatPackage>;
};

export function createRevenueCatBillingAdapter(
  options: RevenueCatBillingAdapterOptions,
): OnbornBillingAdapter {
  return {
    async loadProducts(input): Promise<BillingProduct[]> {
      await identifyRevenueCatUser(options, input.userId);
      const offerings = await options.purchases.getOfferings();
      return localizeProductsFromRevenueCat(input, offerings);
    },
    async purchasePackage(input): Promise<OnbornPurchaseResult> {
      await identifyRevenueCatUser(options, input.userId);
      const offerings = await options.purchases.getOfferings();
      const revenueCatPackage = options.resolvePackage
        ? await options.resolvePackage(input, offerings)
        : resolveRevenueCatPackage(input, offerings);
      const result = await options.purchases.purchasePackage(revenueCatPackage);
      return {
        success: true,
        packageId: input.package.id,
        productId:
          result.productIdentifier ??
          input.product?.storeProductId ??
          input.package.productId,
        entitlementIds: readActiveEntitlementIds(result.customerInfo),
        activeProductIds: readActiveProductIds(result.customerInfo),
        raw: result,
      };
    },
    async restorePurchases(input): Promise<OnbornRestoreResult> {
      await identifyRevenueCatUser(options, input.userId);
      const customerInfo = await options.purchases.restorePurchases();
      return {
        success: true,
        entitlementIds: readActiveEntitlementIds(customerInfo),
        activeProductIds: readActiveProductIds(customerInfo),
        raw: {
          customerInfo,
          productIds: input.products.map((product) => product.storeProductId),
        },
      };
    },
    async refetchCustomerEntitlements(input): Promise<OnbornRestoreResult> {
      await identifyRevenueCatUser(options, input.userId);
      if (!options.purchases.getCustomerInfo) {
        throw new Error("Missing RevenueCat getCustomerInfo implementation.");
      }
      const customerInfo = await options.purchases.getCustomerInfo();
      return {
        success: true,
        entitlementIds: readActiveEntitlementIds(customerInfo),
        activeProductIds: readActiveProductIds(customerInfo),
        raw: { customerInfo },
      };
    },
  };
}

export type ConfigureRevenueCatPurchasesOptions = {
  purchases: RevenueCatPurchasesModule;
  billing?: BillingRuntimeConfig;
  platform?: "ios" | "android";
  userId?: string;
};

export async function configureRevenueCatPurchases(
  options: ConfigureRevenueCatPurchasesOptions,
): Promise<void> {
  if (!options.purchases.configure) {
    throw new Error("Missing RevenueCat configure implementation.");
  }

  const apiKey = resolveRevenueCatSdkKey(options);
  if (!apiKey) {
    throw new Error("Missing RevenueCat public SDK key for current platform.");
  }

  await options.purchases.configure({
    apiKey,
    ...(options.userId
      ? {
          appUserID: options.userId,
        }
      : {}),
  });
}

export function resolveRevenueCatSdkKey(
  options: Pick<ConfigureRevenueCatPurchasesOptions, "billing" | "platform">,
): string | undefined {
  if (options.billing?.provider !== "revenuecat") {
    return undefined;
  }
  const platform = options.platform ?? resolveRuntimePlatform();
  return platform === "android"
    ? options.billing.revenueCat?.androidSdkKey
    : options.billing.revenueCat?.iosSdkKey;
}

async function identifyRevenueCatUser(
  options: RevenueCatBillingAdapterOptions,
  userId: string | undefined,
): Promise<void> {
  if (options.identifyUser === false || !userId || !options.purchases.logIn) {
    return;
  }
  await options.purchases.logIn(userId);
}

function resolveRuntimePlatform(): "ios" | "android" {
  return Platform.OS === "android" ? "android" : "ios";
}

function resolveRevenueCatPackage(
  input: OnbornPurchaseInput,
  offerings: RevenueCatOfferings,
): RevenueCatPackage {
  const match = findRevenueCatPackage(input, offerings);
  if (!match) {
    throw new Error(
      `RevenueCat package not found for ONBORN package '${input.package.id}'.`,
    );
  }
  return match;
}

function findRevenueCatPackage(
  input: OnbornPurchaseInput,
  offerings: RevenueCatOfferings,
): RevenueCatPackage | undefined {
  const candidates = listRevenueCatPackages(input, offerings);
  const productId = input.product?.storeProductId;
  return candidates.find((candidate) => {
    const identifiers = [
      candidate.identifier,
      candidate.packageType,
      candidate.product?.identifier,
      candidate.product?.productIdentifier,
    ].filter(Boolean);
    return (
      identifiers.includes(input.package.id) ||
      identifiers.includes(input.package.productId) ||
      (productId ? identifiers.includes(productId) : false)
    );
  });
}

function listRevenueCatPackages(
  input: OnbornPurchaseInput,
  offerings: RevenueCatOfferings,
): RevenueCatPackage[] {
  const offeringKeys = [
    input.offering.providerOfferingId,
    input.offering.key,
    input.offering.id,
  ].filter((key): key is string => Boolean(key));
  const preferredOfferings = offeringKeys
    .map((key) => offerings.all?.[key])
    .filter((offering): offering is RevenueCatOffering => Boolean(offering));
  const allOfferings = Object.values(offerings.all ?? {}).filter(
    (offering): offering is RevenueCatOffering => Boolean(offering),
  );
  return [...preferredOfferings, offerings.current, ...allOfferings]
    .filter((offering): offering is RevenueCatOffering => Boolean(offering))
    .flatMap((offering) => offering.availablePackages ?? []);
}

function localizeProductsFromRevenueCat(
  input: OnbornLoadProductsInput,
  offerings: RevenueCatOfferings,
): BillingProduct[] {
  if (!input.offering) {
    return input.products;
  }
  const offering = input.offering;
  return input.products.map((product) => {
    const billingPackage = offering.packages.find((item) =>
      packageReferencesProduct(item, product),
    );
    if (!billingPackage) {
      return product;
    }
    const revenueCatPackage = findRevenueCatPackage(
      {
        paywall: input.paywall,
        offering,
        package: billingPackage,
        product,
        userId: input.userId,
      },
      offerings,
    );
    const revenueCatProduct = revenueCatPackage?.product;
    if (!revenueCatProduct) {
      return product;
    }
    return {
      ...product,
      title: revenueCatProduct.title ?? product.title,
      description: revenueCatProduct.description ?? product.description,
      price: readRevenueCatPrice(revenueCatProduct) ?? product.price,
      currency:
        revenueCatProduct.currencyCode ??
        revenueCatProduct.currency ??
        product.currency,
      period:
        revenueCatProduct.subscriptionPeriod ??
        revenueCatProduct.period ??
        product.period,
      trialPeriod:
        readRevenueCatTrialPeriod(revenueCatProduct) ?? product.trialPeriod,
    };
  });
}

function packageReferencesProduct(
  billingPackage: OnbornPurchaseInput["package"],
  product: BillingProduct,
) {
  const referencedIds = [
    billingPackage.productId,
    billingPackage.productIdsByStore?.app_store,
    billingPackage.productIdsByStore?.google_play,
    billingPackage.productIdsByStore?.revenuecat_custom,
  ].filter((value): value is string => Boolean(value));
  return (
    referencedIds.includes(product.id) ||
    referencedIds.includes(product.storeProductId)
  );
}

function readRevenueCatPrice(
  product: RevenueCatStoreProduct,
): string | undefined {
  if (product.priceString) {
    return product.priceString;
  }
  if (product.localizedPriceString) {
    return product.localizedPriceString;
  }
  if (typeof product.price === "string") {
    return product.price;
  }
  return undefined;
}

function readRevenueCatTrialPeriod(
  product: RevenueCatStoreProduct,
): string | undefined {
  return (
    product.trialPeriod ??
    product.trialDuration ??
    product.trial_duration ??
    product.freeTrialPeriod ??
    product.introPrice?.period ??
    product.introPrice?.subscriptionPeriod ??
    product.introductoryPrice?.period ??
    product.introductoryPrice?.subscriptionPeriod
  );
}

function readActiveEntitlementIds(
  customerInfo: RevenueCatCustomerInfo | undefined,
): string[] {
  return Object.keys(customerInfo?.entitlements?.active ?? {});
}

function readActiveProductIds(
  customerInfo: RevenueCatCustomerInfo | undefined,
): string[] {
  return uniqueCompact([
    ...(customerInfo?.activeSubscriptions ?? []),
    ...(customerInfo?.allPurchasedProductIdentifiers ?? []),
    ...(customerInfo?.nonSubscriptionTransactions ?? []).flatMap(
      (transaction) => [transaction.productIdentifier, transaction.productId],
    ),
  ]);
}

function uniqueCompact(values: Array<string | undefined>): string[] {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ];
}
