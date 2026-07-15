import type {
  BillingOffering,
  BillingPackage,
  BillingPlatform,
  BillingProduct,
} from "@onborn/sdk-contracts";
import { resolvePackageProductId } from "@onborn/sdk-contracts";
import type { OnbornPackageWithProduct } from "./types";

export function getPackagesWithProducts(
  offering: BillingOffering | undefined,
  products: BillingProduct[] | undefined,
  platform?: BillingPlatform,
): OnbornPackageWithProduct[] {
  if (!offering) {
    return [];
  }
  const productList = products ?? [];
  return [...offering.packages]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((billingPackage) => ({
      package: billingPackage,
      product: productList.find(
        (product) =>
          product.id === resolvePackageProductId(billingPackage, platform),
      ),
    }));
}

export function resolveDefaultPackageId(
  offering: BillingOffering | undefined,
): string | undefined {
  if (!offering) {
    return undefined;
  }
  return (
    offering.defaultPackageId ??
    offering.packages.find((item) => item.isHighlighted)?.id ??
    offering.packages[0]?.id
  );
}

export function findPackageWithProduct(
  packages: OnbornPackageWithProduct[],
  packageId: string | undefined,
): OnbornPackageWithProduct | undefined {
  if (!packageId) {
    return undefined;
  }
  return packages.find((item) => item.package.id === packageId);
}

export function formatPackagePrice(
  product: BillingProduct | undefined,
  fallback = "",
): string {
  if (!product?.price) {
    return fallback;
  }
  const period = formatBillingPeriod(product.period);
  return period ? `${product.price} / ${period}` : product.price;
}

export function getStoreProductId(
  billingPackage: BillingPackage,
  product: BillingProduct | undefined,
): string {
  return product?.storeProductId ?? product?.id ?? billingPackage.productId;
}

export function formatBillingPeriod(period: string | undefined): string {
  switch (period?.toLowerCase()) {
    case "p1w":
    case "one_week":
      return "week";
    case "p1m":
    case "one_month":
      return "month";
    case "p3m":
    case "three_months":
      return "3 months";
    case "p6m":
    case "six_months":
      return "6 months";
    case "p1y":
    case "one_year":
      return "year";
    default:
      return period ?? "";
  }
}
