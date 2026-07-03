import type {
  BillingOffering,
  BillingPlatform,
  BillingProduct,
  NormalizedPackageSelectorProps,
} from "@onborn/sdk-contracts";
import { resolvePackageProductId } from "@onborn/sdk-contracts";
import { Platform } from "react-native";
import type { ComponentBg } from "../background";
import type { PrimitiveRenderOptions } from "../../primitive-pipeline/types";
import type { PaywallPackageWithProduct, PaywallRenderContext } from "./types";

export function isBuilderCanvasPreview(
  options: PrimitiveRenderOptions | undefined,
) {
  return Boolean(options?.disableInteractionState);
}

export function resolvePaywallPackage(
  options: PrimitiveRenderOptions | undefined,
  packageId: unknown,
): PaywallPackageWithProduct | undefined {
  const offering = options?.paywallContext?.offering;
  if (!offering) {
    return undefined;
  }
  const products = options?.paywallContext?.products ?? [];
  const requestedId =
    typeof packageId === "string" && packageId.trim().length > 0
      ? packageId.trim()
      : undefined;
  const pkg =
    (requestedId
      ? offering.packages.find((item) => item.id === requestedId)
      : undefined) ??
    offering.packages.find((item) => item.id === offering.defaultPackageId) ??
    offering.packages.find((item) => item.isHighlighted) ??
    offering.packages[0];

  if (!pkg) {
    return undefined;
  }

  return {
    pkg,
    product: findPaywallProductForPackage(
      pkg,
      products,
      resolvePaywallPlatform(options),
    ),
  };
}

export function listPaywallPackages(
  offering: BillingOffering | undefined,
  products: BillingProduct[] | undefined,
  platform?: BillingPlatform,
): PaywallPackageWithProduct[] {
  if (!offering) {
    return [];
  }
  const productList = products ?? [];
  return [...offering.packages]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((pkg) => ({
      pkg,
      product: findPaywallProductForPackage(pkg, productList, platform),
    }));
}

export function resolvePackageTitle(
  item: PaywallPackageWithProduct | undefined,
  fallback: string,
): string {
  return (
    item?.pkg.label ??
    item?.product?.title ??
    item?.product?.storeProductId ??
    fallback
  );
}

export function resolvePackageSubtitle(
  item: PaywallPackageWithProduct | undefined,
  fallback: string,
): string {
  return item?.pkg.description ?? item?.product?.description ?? fallback;
}

export function formatPackagePrice(
  item: PaywallPackageWithProduct | undefined,
  fallback: string,
): string {
  const product = item?.product;
  if (!product?.price) {
    return fallback;
  }
  const period = formatBillingPeriod(product.period);
  return period ? `${product.price} / ${period}` : product.price;
}

export function formatPackagePriceTemplate(
  template: string | undefined,
  item: PaywallPackageWithProduct | undefined,
  fallback: string,
): string {
  if (!template) {
    return formatPackagePrice(item, fallback);
  }
  const vars = paywallTemplateVars(item);
  if (template.includes("{price}") && !vars.price) {
    return fallback;
  }
  const text = cleanupPriceTemplateResult(interpolateTemplate(template, vars));
  return text || formatPackagePrice(item, fallback);
}

export function paywallTemplateVars(
  item: PaywallPackageWithProduct | undefined,
): Record<string, string> {
  const product = item?.product;
  return {
    price: product?.price ?? "",
    period: formatBillingPeriod(product?.period),
    trialPeriod: product?.trialPeriod ?? "",
    currency: product?.currency ?? "",
    storeProductId: product?.storeProductId ?? "",
    label: resolvePackageTitle(item, ""),
    description: resolvePackageSubtitle(item, ""),
  };
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

function cleanupPriceTemplateResult(value: string): string {
  return value
    .replace(/\s+\/\s*$/g, "")
    .replace(/^\s*\/\s+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function interpolateTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

export function parsePriceNumber(
  value: string | undefined,
): number | undefined {
  if (!value) {
    return undefined;
  }
  const stripped = value.replace(/\s/g, "").replace(/[^0-9.,]/g, "");
  const lastComma = stripped.lastIndexOf(",");
  const lastDot = stripped.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);
  const numeric =
    decimalIndex >= 0
      ? `${stripped.slice(0, decimalIndex).replace(/[.,]/g, "")}.${stripped
          .slice(decimalIndex + 1)
          .replace(/[.,]/g, "")}`
      : stripped;
  const parsed = Number.parseFloat(numeric);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function placeholderPackages(): PaywallPackageWithProduct[] {
  return [
    {
      pkg: {
        id: "monthly",
        productId: "monthly",
        label: "Monthly",
        description: "Flexible access",
      },
    },
    {
      pkg: {
        id: "annual",
        productId: "annual",
        label: "Annual",
        description: "Best value",
        isHighlighted: true,
      },
    },
  ];
}

export function packagesForSelector(
  options: PrimitiveRenderOptions | undefined,
  selector: NormalizedPackageSelectorProps,
): PaywallPackageWithProduct[] {
  const offering = options?.paywallContext?.offering;
  const products = options?.paywallContext?.products;
  const all = listPaywallPackages(
    offering,
    products,
    resolvePaywallPlatform(options),
  );

  if (selector.singlePackage) {
    const single = selector.packageId
      ? resolvePaywallPackage(options, selector.packageId)
      : null;
    return single ? [single] : placeholderPackages().slice(0, 1);
  }

  const filtered =
    selector.packageIds && selector.packageIds.length > 0
      ? all.filter((item) => selector.packageIds!.includes(item.pkg.id))
      : all;

  return filtered.length > 0 ? filtered : placeholderPackages();
}

function findPaywallProductForPackage(
  pkg: BillingOffering["packages"][number],
  products: BillingProduct[],
  platform: BillingPlatform | undefined,
): BillingProduct | undefined {
  return products.find(
    (product) => product.id === resolvePackageProductId(pkg, platform),
  );
}

function resolvePaywallPlatform(
  options: PrimitiveRenderOptions | undefined,
): BillingPlatform {
  return (
    options?.paywallContext?.platform ??
    (Platform.OS === "android" ? "android" : "ios")
  );
}

export function isPackageSelected(
  item: PaywallPackageWithProduct,
  selectedPackageId: string | undefined,
  index: number,
): boolean {
  if (selectedPackageId) {
    return item.pkg.id === selectedPackageId;
  }
  if (item.pkg.isHighlighted) {
    return true;
  }
  return index === 0;
}

export function toComponentBg(
  bg: NormalizedPackageSelectorProps["cardBg"],
): ComponentBg | undefined {
  if (!bg) {
    return undefined;
  }
  if (typeof bg === "string") {
    return bg;
  }
  return bg as ComponentBg;
}

export function resolvePackageCardBackground(
  ctx: PaywallRenderContext,
  bg: NormalizedPackageSelectorProps["cardBg"],
  fallback: string,
): { solidColor: string; gradientBg?: ComponentBg } {
  const componentBg = toComponentBg(bg);
  if (componentBg && typeof componentBg === "object") {
    return { solidColor: fallback, gradientBg: componentBg };
  }
  const solidColor =
    (typeof componentBg === "string"
      ? ctx.resolveColor(componentBg)
      : undefined) ?? fallback;
  return { solidColor };
}
