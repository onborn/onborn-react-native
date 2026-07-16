import type {
  BillingProduct,
  NativeStoreRestoredPurchase,
} from "@onborn/sdk-contracts";
import type {
  OnbornBillingAdapter,
  OnbornLoadProductsInput,
  OnbornPurchaseInput,
  OnbornPurchaseResult,
  OnbornRestoreInput,
  OnbornRestoreResult,
} from "../types";

type NativeStoresPurchase = {
  id?: string;
  productId?: string;
  storeProductId?: string;
  transactionId?: string;
  purchaseToken?: string;
  originalTransactionIdentifierIOS?: string;
  raw?: unknown;
};

type NativeStoresProduct = {
  productId?: string;
  storeProductId?: string;
  id?: string;
  title?: string;
  description?: string;
  price?: string | number;
  priceString?: string;
  localizedPrice?: string;
  localizedPriceString?: string;
  displayPrice?: string;
  formattedPrice?: string;
  currency?: string;
  currencyCode?: string;
  period?: string;
  subscriptionPeriod?: string;
  raw?: unknown;
};

type NativeStoresRestoreOutput =
  | NativeStoreRestoredPurchase[]
  | {
      purchases?: NativeStoreRestoredPurchase[];
      raw?: unknown;
    }
  | unknown[]
  | void;

export type NativeStoresBillingAdapterOptions = {
  loadProducts?: (
    input: OnbornLoadProductsInput & {
      storeProductIds: string[];
    },
  ) => Promise<NativeStoresProduct[] | void>;
  purchaseProduct: (
    input: OnbornPurchaseInput & {
      storeProductId: string;
    },
  ) => Promise<NativeStoresPurchase | void>;
  restorePurchases?: (
    input: OnbornRestoreInput,
  ) => Promise<NativeStoresRestoreOutput>;
  refetchCustomerEntitlements?: (input: {
    userId?: string;
  }) => Promise<unknown>;
};

export function createNativeStoresBillingAdapter(
  options: NativeStoresBillingAdapterOptions,
): OnbornBillingAdapter {
  return {
    async loadProducts(input): Promise<BillingProduct[]> {
      if (!options.loadProducts) {
        return input.products;
      }
      const storeProductIds = input.products
        .map((product) => product.storeProductId)
        .filter((id): id is string => Boolean(id?.trim()));
      if (storeProductIds.length === 0) {
        return input.products;
      }
      const nativeProducts = (await options.loadProducts({
        ...input,
        storeProductIds: Array.from(new Set(storeProductIds)),
      })) ?? [];
      if (nativeProducts.length === 0) {
        return input.products;
      }
      return localizeProducts(input.products, nativeProducts);
    },

    async purchasePackage(input): Promise<OnbornPurchaseResult> {
      const storeProductId = input.product?.storeProductId;
      if (!storeProductId) {
        throw new Error(
          `Missing storeProductId for ONBORN package '${input.package.id}'.`,
        );
      }

      const purchase = await options.purchaseProduct({
        ...input,
        storeProductId,
      });
      return {
        success: true,
        packageId: input.package.id,
        productId: storeProductId,
        transactionId: readTransactionId(purchase),
        purchaseToken: purchase?.purchaseToken,
        raw: purchase,
      };
    },
    async restorePurchases(input): Promise<OnbornRestoreResult> {
      if (!options.restorePurchases) {
        throw new Error(
          "Missing native store restorePurchases implementation.",
        );
      }
      const result = await options.restorePurchases(input);
      const normalized = normalizeNativeRestoreOutput(result);
      return {
        success: true,
        purchases: normalized.purchases,
        raw: normalized.raw,
      };
    },
    async refetchCustomerEntitlements(input): Promise<OnbornRestoreResult> {
      const result = await options.refetchCustomerEntitlements?.(input);
      return {
        success: true,
        raw: result,
      };
    },
  };
}

function localizeProducts(
  products: BillingProduct[],
  nativeProducts: NativeStoresProduct[],
): BillingProduct[] {
  return products.map((product) => {
    const nativeProduct = findNativeProduct(product, nativeProducts);
    if (!nativeProduct) {
      return product;
    }
    return {
      ...product,
      title: readString(nativeProduct.title) ?? product.title,
      description: readString(nativeProduct.description) ?? product.description,
      price: readNativePrice(nativeProduct) ?? product.price,
      currency:
        readString(nativeProduct.currencyCode) ??
        readString(nativeProduct.currency) ??
        product.currency,
      period:
        readString(nativeProduct.subscriptionPeriod) ??
        readString(nativeProduct.period) ??
        product.period,
      metadata: {
        ...product.metadata,
        nativeStoreProduct: nativeProduct.raw ?? nativeProduct,
      },
    };
  });
}

function findNativeProduct(
  product: BillingProduct,
  nativeProducts: NativeStoresProduct[],
): NativeStoresProduct | undefined {
  return nativeProducts.find((nativeProduct) => {
    const identifiers = [
      nativeProduct.storeProductId,
      nativeProduct.productId,
      nativeProduct.id,
    ].filter(Boolean);
    return (
      identifiers.includes(product.storeProductId) ||
      identifiers.includes(product.id)
    );
  });
}

function readNativePrice(product: NativeStoresProduct): string | undefined {
  return (
    readString(product.priceString) ??
    readString(product.localizedPriceString) ??
    readString(product.localizedPrice) ??
    readString(product.displayPrice) ??
    readString(product.formattedPrice) ??
    readPriceValue(product.price)
  );
}

function normalizeNativeRestoreOutput(output: NativeStoresRestoreOutput): {
  purchases: NativeStoreRestoredPurchase[];
  raw: unknown;
} {
  if (Array.isArray(output)) {
    return {
      purchases: output
        .map(normalizeNativeRestoredPurchase)
        .filter((item): item is NativeStoreRestoredPurchase => Boolean(item)),
      raw: output,
    };
  }

  if (output && typeof output === "object") {
    const result = output as {
      purchases?: unknown;
      raw?: unknown;
    };
    const purchases = Array.isArray(result.purchases)
      ? result.purchases
          .map(normalizeNativeRestoredPurchase)
          .filter((item): item is NativeStoreRestoredPurchase => Boolean(item))
      : [];
    return {
      purchases,
      raw: result.raw ?? output,
    };
  }

  return {
    purchases: [],
    raw: output,
  };
}

function normalizeNativeRestoredPurchase(
  value: unknown,
): NativeStoreRestoredPurchase | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const store = record.store;
  const storeProductId =
    readString(record.storeProductId) ??
    readString(record.productId) ??
    readString(record.productIds);
  if ((store !== "app_store" && store !== "google_play") || !storeProductId) {
    return null;
  }
  return {
    store,
    storeProductId,
    transactionId:
      readString(record.transactionId) ??
      readString(record.id) ??
      readString(record.originalTransactionIdentifierIOS),
    purchaseToken: readString(record.purchaseToken),
    raw: record.raw ?? value,
  };
}

function readTransactionId(
  purchase: NativeStoresPurchase | void,
): string | undefined {
  return (
    purchase?.transactionId ??
    purchase?.id ??
    purchase?.originalTransactionIdentifierIOS
  );
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function readPriceValue(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return readString(value);
}
