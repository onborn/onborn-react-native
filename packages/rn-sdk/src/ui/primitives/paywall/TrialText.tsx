import React from "react";
import { Text } from "tamagui";
import type { PaywallPrimitiveComponentProps } from "./types";
import {
  interpolateTemplate,
  paywallTemplateVars,
  resolvePaywallPackage,
} from "./utils";

export function TrialText({ ctx, props }: PaywallPrimitiveComponentProps) {
  const { flowTheme } = ctx;
  const trial = props as {
    packageId?: string;
    template?: string;
    fallbackText?: string;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    textAlign?: "left" | "center" | "right";
  };
  const paywallPackage = resolvePaywallPackage(ctx.options, trial.packageId);
  const vars = paywallTemplateVars(paywallPackage);
  const text = resolveTrialText({
    template: trial.template,
    fallbackText: trial.fallbackText,
    trialPeriod: paywallPackage?.product?.trialPeriod,
    vars,
  });
  if (!text) {
    return null;
  }
  const fontSize = trial.fontSize ?? 14;
  return (
    <Text
      width="100%"
      textAlign={trial.textAlign ?? "center"}
      color={ctx.resolveColor(trial.color) ?? flowTheme.colors.secondary}
      fontSize={fontSize}
      lineHeight={fontSize * 1.35}
      fontFamily={
        trial.fontFamily ?? flowTheme.fonts.body ?? ctx.layoutFontFamily
      }
      fontWeight={trial.fontWeight ?? "500"}
    >
      {text}
    </Text>
  );
}

function resolveTrialText(input: {
  template: string | undefined;
  fallbackText: string | undefined;
  trialPeriod: string | undefined;
  vars: Record<string, string>;
}): string {
  if (!input.trialPeriod) {
    return input.fallbackText ?? "";
  }
  if (!input.template) {
    return `${input.trialPeriod} free trial`;
  }
  return cleanupTemplateText(interpolateTemplate(input.template, input.vars));
}

function cleanupTemplateText(value: string): string {
  return value.replace(/\s{2,}/g, " ").trim();
}
