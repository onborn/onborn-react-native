import React from "react";
import {
  DEFAULT_FLOW_THEME,
  resolveFlowTheme,
  resolveThemeToken,
} from "../theme/flowTheme";
import {
  CloseButton,
  FeatureList,
  LegalText,
  PackageSelector,
  RestorePurchasesButton,
  TermsLinks,
  TrialText,
  type PaywallRenderContext,
} from "../primitives/paywall";
import type { PrimitiveRenderOptions } from "./types";

export function renderPaywallPrimitive(
  type: string,
  props: Record<string, unknown>,
  options?: PrimitiveRenderOptions,
): React.ReactNode | undefined {
  const flowTheme = resolveFlowTheme(options?.flowTheme) ?? DEFAULT_FLOW_THEME;
  const ctx: PaywallRenderContext = {
    options,
    flowTheme,
    resolveColor: (value) => resolveThemeToken(value, flowTheme),
    layoutFontFamily: options?.layoutFontFamily,
  };

  switch (type) {
    case "package_selector":
    case "package_card":
    case "package_list":
      return <PackageSelector ctx={ctx} rawType={type} props={props} />;
    case "trial_text":
      return <TrialText ctx={ctx} props={props} />;
    case "feature_list":
      return <FeatureList ctx={ctx} props={props} />;
    case "restore_purchases_button":
      return <RestorePurchasesButton ctx={ctx} props={props} />;
    case "close_button":
      return <CloseButton ctx={ctx} props={props} />;
    case "legal_text":
      return <LegalText ctx={ctx} props={props} />;
    case "terms_links":
      return <TermsLinks ctx={ctx} props={props} />;
    default:
      return undefined;
  }
}
