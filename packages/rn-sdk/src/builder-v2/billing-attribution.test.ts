import assert from "node:assert/strict";
import { test } from "node:test";

import { createBuilderV2BillingPort } from "./billing-port";

test("a purchase names the paywall screen it was made on", async () => {
  const calls: Array<{ packageId?: string; paywallId?: string }> = [];
  const port = createBuilderV2BillingPort(() => ({
    async purchasePackage(packageId, context) {
      calls.push({ packageId, paywallId: context?.paywallId });
      return {
        success: true,
        status: "validated" as const,
        productId: "product-1",
      };
    },
    async restorePurchases() {
      return { success: true, status: "validated" as const, entitlements: [] };
    },
  }));

  await port.purchase({ packageId: "package-1", screenId: "paywall-screen" });

  assert.deepEqual(calls, [
    { packageId: "package-1", paywallId: "paywall-screen" },
  ]);
});
