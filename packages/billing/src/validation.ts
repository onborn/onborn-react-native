import type { PaywallConfig } from "@onborn/sdk-contracts";
import type { BillingClient } from "./client";
import type {
  OnbornPackageWithProduct,
  OnbornPurchaseResult,
  OnbornRestoreResult,
} from "./types";
import type { BillingOffering } from "@onborn/sdk-contracts";

export type BillingValidationClient = Pick<
  BillingClient,
  "validatePurchase" | "restorePurchases"
>;

type ValidateBillingPurchaseInput = {
  client: BillingValidationClient;
  paywall?: PaywallConfig;
  offering: BillingOffering;
  item: OnbornPackageWithProduct;
  result: OnbornPurchaseResult;
};

type ValidateBillingRestoreInput = {
  client: BillingValidationClient;
  offering?: BillingOffering;
  result: OnbornRestoreResult;
};

export async function validateBillingPurchase(
  input: ValidateBillingPurchaseInput,
): Promise<OnbornPurchaseResult> {
  const product = input.item.product;
  if (!product) {
    throw new Error(
      `Missing product for ONBORN package '${input.item.package.id}'.`,
    );
  }

  const response = await input.client.validatePurchase({
    idempotencyKey: createPurchaseIdempotencyKey(input),
    paywallId: input.paywall?.id,
    offeringId: input.offering.id,
    packageId: input.item.package.id,
    productId: product.id,
    storeProductId: product.storeProductId,
    provider: input.offering.provider,
    store: product.store,
    transactionId: input.result.transactionId,
    purchaseToken: input.result.purchaseToken,
    receipt: input.result.receipt,
    raw: input.result.raw,
  });

  return {
    ...input.result,
    status: response.status,
    purchaseId: response.purchaseId,
    entitlements: response.entitlements,
    entitlementIds: response.entitlements.map((item) => item.key),
  };
}

export async function validateBillingRestore(
  input: ValidateBillingRestoreInput,
): Promise<OnbornRestoreResult> {
  const response = await input.client.restorePurchases({
    idempotencyKey: createRestoreIdempotencyKey(input),
    provider: input.offering?.provider,
    activeEntitlementKeys: input.result.entitlementIds,
    activeProductIds: input.result.activeProductIds,
    purchases: input.result.purchases,
    raw: input.result.raw,
  });

  return {
    ...input.result,
    status: response.status,
    purchaseId: response.purchaseId,
    entitlements: response.entitlements,
    entitlementIds: response.entitlements.map((item) => item.key),
  };
}

function createPurchaseIdempotencyKey(
  input: ValidateBillingPurchaseInput,
): string {
  const stablePart =
    input.result.transactionId ??
    input.result.purchaseToken ??
    input.result.productId ??
    input.item.product?.storeProductId ??
    input.item.package.id;
  return [
    "purchase",
    input.offering.id,
    input.item.package.id,
    stablePart,
  ].join(":");
}

function createRestoreIdempotencyKey(
  input: ValidateBillingRestoreInput,
): string {
  return ["restore", input.offering?.id ?? "unknown", String(Date.now())].join(
    ":",
  );
}
