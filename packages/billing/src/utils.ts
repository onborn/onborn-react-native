import type {
  BillingOffering,
  BillingPackage,
  BillingPeriod,
  BillingPeriodUnit,
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

/**
 * @deprecated Use `BillingPeriod` from `@onborn/sdk-contracts`.
 * Kept as an alias so existing imports keep compiling.
 */
export type ParsedBillingPeriod = BillingPeriod;

const PERIOD_UNIT_DAYS: Record<BillingPeriodUnit, number> = {
  day: 1,
  week: 7,
  month: 30.4375,
  year: 365.25,
};

const NAMED_PERIODS: Record<string, BillingPeriod> = {
  day: { unit: "day", count: 1 },
  daily: { unit: "day", count: 1 },
  one_day: { unit: "day", count: 1 },
  week: { unit: "week", count: 1 },
  weekly: { unit: "week", count: 1 },
  one_week: { unit: "week", count: 1 },
  month: { unit: "month", count: 1 },
  monthly: { unit: "month", count: 1 },
  one_month: { unit: "month", count: 1 },
  two_months: { unit: "month", count: 2 },
  three_months: { unit: "month", count: 3 },
  six_months: { unit: "month", count: 6 },
  year: { unit: "year", count: 1 },
  yearly: { unit: "year", count: 1 },
  annual: { unit: "year", count: 1 },
  one_year: { unit: "year", count: 1 },
};

/**
 * Parse a store billing period into machine-readable form.
 *
 * Stores disagree on the wire format: Apple sends ISO-8601 durations (`P1Y`),
 * Play sends the same or a named constant, and catalog sync may pass through
 * whatever the store gave it. Anything unrecognized returns `undefined` rather
 * than a guess — a wrong period silently corrupts price math.
 */
export function parseBillingPeriod(
  period: string | undefined,
): BillingPeriod | undefined {
  const normalized = period?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  const named = NAMED_PERIODS[normalized];
  if (named) {
    return named;
  }
  // ISO-8601 duration: P1Y, P6M, P2W, P30D.
  const iso = normalized.match(/^p(\d+)([dwmy])$/);
  if (!iso) {
    return undefined;
  }
  const count = Number(iso[1]);
  if (!Number.isFinite(count) || count <= 0) {
    return undefined;
  }
  const unit = { d: "day", w: "week", m: "month", y: "year" } as const;
  const key = iso[2] as keyof typeof unit;
  return { unit: unit[key], count };
}

/** Format an amount using the store's currency, falling back to a plain number. */
export function formatPrice(
  amount: number,
  currency: string | undefined,
  locale?: string,
): string {
  if (!Number.isFinite(amount)) {
    return "";
  }
  if (currency) {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      // Unknown currency code or an environment without full ICU data.
    }
  }
  return amount.toFixed(2);
}

/**
 * Break a subscription price down to a shorter unit — the "only 9,99 zł/week"
 * line every annual plan shows.
 *
 * Returns `undefined` (never a guess) when the product has no numeric price or
 * an unparseable period, so a missing value is visibly missing instead of
 * quietly wrong.
 */
export function getPricePerPeriod(
  product: BillingProduct | undefined,
  unit: BillingPeriodUnit,
  options?: { locale?: string },
): { amount: number; formatted: string } | undefined {
  const amount = product?.priceAmount;
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return undefined;
  }
  const period = resolveBillingPeriod(product);
  if (!period) {
    return undefined;
  }
  const periodUnitDays = PERIOD_UNIT_DAYS[period.unit];
  const targetDays = PERIOD_UNIT_DAYS[unit];
  if (!periodUnitDays || !targetDays) {
    return undefined;
  }
  const periodDays = periodUnitDays * period.count;
  if (periodDays <= 0) {
    return undefined;
  }
  const perUnit = (amount / periodDays) * targetDays;
  return {
    amount: perUnit,
    formatted: formatPrice(perUnit, product?.currency, options?.locale),
  };
}

/**
 * The product's renewal period, preferring the adapter-normalized
 * `billingPeriod` and falling back to parsing the raw store string.
 */
export function resolveBillingPeriod(
  product: BillingProduct | undefined,
): BillingPeriod | undefined {
  return product?.billingPeriod ?? parseBillingPeriod(product?.period);
}
