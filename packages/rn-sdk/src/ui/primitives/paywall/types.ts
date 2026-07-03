import type { BillingPackage, BillingProduct } from "@onborn/sdk-contracts";
import type { resolveFlowTheme } from "../../theme/flowTheme";
import type { PrimitiveRenderOptions } from "../../primitive-pipeline/types";

export type PaywallPackageWithProduct = {
  pkg: BillingPackage;
  product?: BillingProduct;
};

export type PaywallRenderContext = {
  options: PrimitiveRenderOptions | undefined;
  flowTheme: ReturnType<typeof resolveFlowTheme>;
  resolveColor: (value: string | undefined) => string | undefined;
  layoutFontFamily?: string;
};

export type PaywallPrimitiveComponentProps = {
  ctx: PaywallRenderContext;
  props: Record<string, unknown>;
};

export type PackageSelectorProps = {
  ctx: PaywallRenderContext;
  rawType: string;
  props: Record<string, unknown>;
};
