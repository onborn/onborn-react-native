import assert from "node:assert/strict";
import test from "node:test";

import { OnbornPurchaseError } from "@onborn/billing";

import {
  createBuilderV2BillingPort,
  mapPurchaseResult,
  mapRestoreResult,
} from "./billing-port";

test("maps only backend-validated purchases to completed", () => {
  assert.deepEqual(
    mapPurchaseResult({
      success: true,
      status: "validated",
      productId: "premium_yearly",
    }),
    { status: "completed", productId: "premium_yearly" },
  );
  assert.deepEqual(mapPurchaseResult({ success: false, status: "pending" }), {
    status: "pending",
  });
  assert.throws(
    () => mapPurchaseResult({ success: false, status: "rejected" }),
    /could not validate/,
  );
});

test("returns only active restored entitlement keys", () => {
  assert.deepEqual(
    mapRestoreResult({
      success: true,
      status: "validated",
      entitlements: [
        createEntitlement("premium", true),
        createEntitlement("expired", false),
      ],
    }),
    { status: "completed", entitlementKeys: ["premium"] },
  );
  assert.deepEqual(mapRestoreResult({ success: true, status: "validated" }), {
    status: "empty",
  });
  assert.throws(
    () => mapRestoreResult({ success: false, status: "rejected" }),
    /could not validate/,
  );
});

test("normalizes explicit cancellation without hiding other errors", async () => {
  const cancelled = createBuilderV2BillingPort(() => ({
    purchasePackage: async () => {
      throw new OnbornPurchaseError("user_cancelled", "Cancelled.");
    },
    restorePurchases: async () => ({ success: true, status: "validated" }),
  }));
  assert.deepEqual(await cancelled.purchase({ packageId: "premium" }), {
    status: "cancelled",
  });

  const failed = createBuilderV2BillingPort(() => ({
    purchasePackage: async () => {
      throw new OnbornPurchaseError("validation_failed", "Invalid receipt.");
    },
    restorePurchases: async () => ({ success: true, status: "validated" }),
  }));
  await assert.rejects(
    () => failed.purchase({ packageId: "premium" }),
    /Invalid receipt/,
  );
});

function createEntitlement(key: string, active: boolean) {
  return {
    id: `customer-${key}`,
    projectId: "project",
    environment: "test" as const,
    userId: "user",
    entitlementId: `entitlement-${key}`,
    key,
    label: key,
    active,
  };
}
