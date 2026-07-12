import { z } from "zod";
import { ComponentBgSchema, PrimitiveBaseSchema } from "./primitives/schema";

/** Shared text styling props for paywall copy primitives. */
export const PaywallTextStylePropsSchema = z
  .object({
    color: z.string().optional(),
    fontSize: z.number().min(8).max(96).optional(),
    fontFamily: z.string().optional(),
    fontWeight: z.string().optional(),
    textAlign: z.enum(["left", "center", "right"]).optional(),
    lineHeight: z.number().min(8).max(120).optional(),
  })
  .strict();

export const PackageSelectorLayoutSchema = z.enum(["list", "grid", "compact"]);

export type PackageSelectorLayout = z.infer<typeof PackageSelectorLayoutSchema>;

/** Maps legacy `card` values to `grid`. */
export function normalizePackageSelectorLayout(
  layout: unknown,
  fallback: PackageSelectorLayout = "list",
): PackageSelectorLayout {
  if (layout === "list" || layout === "grid" || layout === "compact") {
    return layout;
  }
  if (layout === "card") {
    return "grid";
  }
  return fallback;
}

export const PackageSelectorIndicatorSchema = z.enum([
  "border",
  "radio",
  "checkmark",
  "checkbox",
]);

export const PackageSelectorIndicatorPositionSchema = z.enum([
  "leading",
  "trailing",
]);

export const PackageSelectorBadgePositionSchema = z.enum([
  "left",
  "center",
  "right",
]);

export const PaywallPackageSelectorPrimitiveSchema = PrimitiveBaseSchema.extend(
  {
    type: z.literal("package_selector"),
    props: PaywallTextStylePropsSchema.extend({
      layout: PackageSelectorLayoutSchema.default("list"),
      /**
       * Explicit flag for the "single package" rendering mode. When true the
       * primitive renders only `packageId` (or a placeholder if absent). When
       * absent we fall back to inferring single-mode from the presence of
       * `packageId` to keep older drafts working.
       */
      singlePackage: z.boolean().optional(),
      packageId: z.string().optional(),
      packageIds: z.array(z.string().min(1)).optional(),
      selectedPackageId: z.string().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      badge: z.string().optional(),
      gap: z.number().min(0).max(64).optional(),
      borderRadius: z.number().min(0).max(64).optional(),
      borderWidth: z.number().min(0).max(8).optional(),
      padding: z.number().min(0).max(48).optional(),
      cardBg: ComponentBgSchema.optional(),
      borderColor: z.string().optional(),
      selectedBorderColor: z.string().optional(),
      selectionColor: z.string().optional(),
      selectedIndicator: PackageSelectorIndicatorSchema.optional(),
      indicatorPosition: PackageSelectorIndicatorPositionSchema.optional(),
      showPrice: z.boolean().optional(),
      priceTemplate: z.string().optional(),
      priceFallback: z.string().optional(),
      priceColor: z.string().optional(),
      priceFontSize: z.number().min(8).max(48).optional(),
      priceFontFamily: z.string().optional(),
      priceFontWeight: z.string().optional(),
      showDescription: z.boolean().optional(),
      showBadge: z.boolean().optional(),
      subtitleColor: z.string().optional(),
      subtitleFontSize: z.number().min(8).max(48).optional(),
      subtitleFontFamily: z.string().optional(),
      subtitleFontWeight: z.string().optional(),
      badgeBg: z.string().optional(),
      badgeColor: z.string().optional(),
      badgeFontSize: z.number().min(8).max(32).optional(),
      badgeFontFamily: z.string().optional(),
      badgeFontWeight: z.string().optional(),
      badgePosition: PackageSelectorBadgePositionSchema.optional(),
    }).passthrough(),
  },
);

/** @deprecated Use package_selector with layout "grid". Kept for published configs. */
export const PaywallPackageCardPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("package_card"),
  props: z.record(z.string(), z.unknown()),
});

/** @deprecated Use package_selector with layout "list". Kept for published configs. */
export const PaywallPackageListPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("package_list"),
  props: z.record(z.string(), z.unknown()),
});

export const PaywallPriceTextPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("price_text"),
  props: PaywallTextStylePropsSchema.extend({
    packageId: z.string().optional(),
    fallbackText: z.string().optional(),
    template: z.string().optional(),
    comparePackageId: z.string().optional(),
    showSavingsPercent: z.boolean().optional(),
    strikethroughColor: z.string().optional(),
  }).passthrough(),
});

export const PaywallTrialTextPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("trial_text"),
  props: PaywallTextStylePropsSchema.extend({
    packageId: z.string().optional(),
    template: z.string().optional(),
    fallbackText: z.string().optional(),
  }).passthrough(),
});

export const PaywallFeatureListItemSchema = z
  .object({
    text: z.string().min(1),
    icon: z.string().optional(),
  })
  .strict();

export const PaywallFeatureListPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("feature_list"),
  props: z
    .object({
      items: z.array(PaywallFeatureListItemSchema).default([]),
      iconColor: z.string().optional(),
      textColor: z.string().optional(),
      fontSize: z.number().min(8).max(48).optional(),
      fontFamily: z.string().optional(),
      fontWeight: z.string().optional(),
      lineHeight: z.enum(["normal", "tight", "relaxed"]).optional(),
      gap: z.number().min(0).max(64).optional(),
      iconSize: z.number().min(8).max(48).optional(),
      iconWeight: z
        .enum(["thin", "light", "regular", "bold", "fill", "duotone"])
        .optional(),
      cardBg: ComponentBgSchema.optional(),
      cardRadius: z.number().min(0).max(999).optional(),
      cardHeight: z.number().min(0).max(240).optional(),
      cardPadding: z.number().min(0).max(64).optional(),
    })
    .passthrough(),
});

export const PaywallRestorePurchasesButtonPrimitiveSchema =
  PrimitiveBaseSchema.extend({
    type: z.literal("restore_purchases_button"),
    props: PaywallTextStylePropsSchema.extend({
      text: z.string().default("Restore purchases"),
      variant: z.enum(["text", "link", "ghost"]).optional(),
    }).passthrough(),
  });

export const PaywallCloseButtonPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("close_button"),
  props: PaywallTextStylePropsSchema.extend({
    text: z.string().optional(),
    display: z.enum(["icon", "text", "icon_text"]).optional(),
    showIn: z.enum(["standalone", "flow", "both"]).optional(),
    bg: ComponentBgSchema.optional(),
    iconColor: z.string().optional(),
    size: z.number().min(24).max(96).optional(),
    iconSize: z.number().min(8).max(48).optional(),
    borderRadius: z.number().min(0).max(999).optional(),
    paddingHorizontal: z.number().min(0).max(64).optional(),
    gap: z.number().min(0).max(32).optional(),
  }).passthrough(),
});

export const PaywallLegalTextPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("legal_text"),
  props: PaywallTextStylePropsSchema.extend({
    text: z
      .string()
      .default("Subscription renews automatically unless canceled."),
    maxWidth: z.number().min(120).max(600).optional(),
  }).passthrough(),
});

export const PaywallTermsLinkSchema = z
  .object({
    label: z.string().min(1),
    url: z.string().url(),
  })
  .strict();

export const PaywallTermsLinksPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("terms_links"),
  props: PaywallTextStylePropsSchema.extend({
    links: z.array(PaywallTermsLinkSchema).default([]),
    separator: z.string().optional(),
  }).passthrough(),
});

export type PaywallTermsLink = z.infer<typeof PaywallTermsLinkSchema>;

export type NormalizedPackageSelectorProps = {
  layout: PackageSelectorLayout;
  /** Resolved single-package rendering mode (explicit flag wins over legacy
   * `packageId`-presence inference). */
  singlePackage: boolean;
  packageId?: string;
  packageIds?: string[];
  selectedPackageId?: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  gap?: number;
  borderRadius?: number;
  borderWidth?: number;
  padding?: number;
  cardBg?: z.infer<typeof ComponentBgSchema>;
  borderColor?: string;
  selectedBorderColor?: string;
  selectionColor?: string;
  selectedIndicator?: z.infer<typeof PackageSelectorIndicatorSchema>;
  indicatorPosition?: z.infer<typeof PackageSelectorIndicatorPositionSchema>;
  showPrice?: boolean;
  priceTemplate?: string;
  priceFallback?: string;
  priceColor?: string;
  priceFontSize?: number;
  priceFontFamily?: string;
  priceFontWeight?: string;
  showDescription?: boolean;
  showBadge?: boolean;
  subtitleColor?: string;
  subtitleFontSize?: number;
  subtitleFontFamily?: string;
  subtitleFontWeight?: string;
  badgeBg?: string;
  badgeColor?: string;
  badgeFontSize?: number;
  badgeFontFamily?: string;
  badgeFontWeight?: string;
  badgePosition?: z.infer<typeof PackageSelectorBadgePositionSchema>;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
};

export function isDeprecatedPaywallPackagePrimitiveType(
  type: string,
): type is "package_card" | "package_list" {
  return type === "package_card" || type === "package_list";
}

export function normalizePackageSelectorProps(
  type: string,
  props: Record<string, unknown> = {},
): NormalizedPackageSelectorProps {
  const layoutFromProps = normalizePackageSelectorLayout(props.layout);
  const layout =
    props.layout != null
      ? layoutFromProps
      : type === "package_card"
        ? "grid"
        : type === "package_list"
          ? "list"
          : "list";

  const packageIdProp =
    typeof props.packageId === "string" ? props.packageId : undefined;
  const singlePackage =
    typeof props.singlePackage === "boolean"
      ? props.singlePackage
      : // Legacy drafts: presence of a `packageId` implied single-package mode.
        Boolean(packageIdProp);

  return {
    layout,
    singlePackage,
    packageId: packageIdProp,
    packageIds: Array.isArray(props.packageIds)
      ? props.packageIds.filter(
          (id): id is string => typeof id === "string" && id.length > 0,
        )
      : undefined,
    selectedPackageId:
      typeof props.selectedPackageId === "string"
        ? props.selectedPackageId
        : undefined,
    title: typeof props.title === "string" ? props.title : undefined,
    subtitle: typeof props.subtitle === "string" ? props.subtitle : undefined,
    badge: typeof props.badge === "string" ? props.badge : undefined,
    gap: typeof props.gap === "number" ? props.gap : undefined,
    borderRadius:
      typeof props.borderRadius === "number" ? props.borderRadius : undefined,
    borderWidth:
      typeof props.borderWidth === "number" ? props.borderWidth : undefined,
    padding: typeof props.padding === "number" ? props.padding : undefined,
    cardBg: readComponentBgProp(props.cardBg),
    borderColor:
      typeof props.borderColor === "string" ? props.borderColor : undefined,
    selectedBorderColor:
      typeof props.selectedBorderColor === "string"
        ? props.selectedBorderColor
        : undefined,
    selectionColor:
      typeof props.selectionColor === "string"
        ? props.selectionColor
        : undefined,
    selectedIndicator:
      props.selectedIndicator === "border" ||
      props.selectedIndicator === "radio" ||
      props.selectedIndicator === "checkmark" ||
      props.selectedIndicator === "checkbox"
        ? props.selectedIndicator
        : undefined,
    indicatorPosition:
      props.indicatorPosition === "leading" ||
      props.indicatorPosition === "trailing"
        ? props.indicatorPosition
        : undefined,
    showPrice:
      typeof props.showPrice === "boolean" ? props.showPrice : undefined,
    priceTemplate:
      typeof props.priceTemplate === "string" ? props.priceTemplate : undefined,
    priceFallback:
      typeof props.priceFallback === "string" ? props.priceFallback : undefined,
    priceColor:
      typeof props.priceColor === "string" ? props.priceColor : undefined,
    priceFontSize:
      typeof props.priceFontSize === "number" ? props.priceFontSize : undefined,
    priceFontFamily:
      typeof props.priceFontFamily === "string"
        ? props.priceFontFamily
        : undefined,
    priceFontWeight:
      typeof props.priceFontWeight === "string"
        ? props.priceFontWeight
        : undefined,
    showDescription:
      typeof props.showDescription === "boolean"
        ? props.showDescription
        : undefined,
    showBadge:
      typeof props.showBadge === "boolean" ? props.showBadge : undefined,
    subtitleColor: readPackageSelectorSubtitleColorProp(props.subtitleColor),
    subtitleFontSize:
      typeof props.subtitleFontSize === "number"
        ? props.subtitleFontSize
        : undefined,
    subtitleFontFamily:
      typeof props.subtitleFontFamily === "string"
        ? props.subtitleFontFamily
        : undefined,
    subtitleFontWeight:
      typeof props.subtitleFontWeight === "string"
        ? props.subtitleFontWeight
        : undefined,
    badgeBg: typeof props.badgeBg === "string" ? props.badgeBg : undefined,
    badgeColor:
      typeof props.badgeColor === "string" ? props.badgeColor : undefined,
    badgeFontSize:
      typeof props.badgeFontSize === "number" ? props.badgeFontSize : undefined,
    badgeFontFamily:
      typeof props.badgeFontFamily === "string"
        ? props.badgeFontFamily
        : undefined,
    badgeFontWeight:
      typeof props.badgeFontWeight === "string"
        ? props.badgeFontWeight
        : undefined,
    badgePosition:
      props.badgePosition === "left" ||
      props.badgePosition === "center" ||
      props.badgePosition === "right"
        ? props.badgePosition
        : undefined,
    color: typeof props.color === "string" ? props.color : undefined,
    fontSize: typeof props.fontSize === "number" ? props.fontSize : undefined,
    fontFamily:
      typeof props.fontFamily === "string" ? props.fontFamily : undefined,
    fontWeight:
      typeof props.fontWeight === "string" ? props.fontWeight : undefined,
  };
}

export function migratePaywallPrimitiveEntry(
  primitiveKey: string,
  primitive: { type: string; props?: Record<string, unknown> } & Record<
    string,
    unknown
  >,
): { type: string; props: Record<string, unknown> } & Record<string, unknown> {
  if (!isDeprecatedPaywallPackagePrimitiveType(primitive.type)) {
    return primitive as typeof primitive & { props: Record<string, unknown> };
  }

  const props = {
    ...(primitive.props ?? {}),
    layout: normalizePackageSelectorProps(primitive.type, primitive.props ?? {})
      .layout,
  };

  return {
    ...primitive,
    type: "package_selector",
    props,
  };
}

function readComponentBgProp(
  value: unknown,
): z.infer<typeof ComponentBgSchema> | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (record.type === "linear_gradient") {
    const stops = Array.isArray(record.stops)
      ? record.stops
          .filter(
            (stop): stop is { color: string; position?: number } =>
              !!stop &&
              typeof stop === "object" &&
              !Array.isArray(stop) &&
              typeof (stop as Record<string, unknown>).color === "string",
          )
          .slice(0, 4)
      : undefined;
    return {
      type: "linear_gradient",
      ...(typeof record.preset === "string" && record.preset.length > 0
        ? { preset: record.preset }
        : {}),
      ...(typeof record.angle === "number" ? { angle: record.angle } : {}),
      ...(stops && stops.length >= 2 ? { stops } : {}),
    };
  }
  if (record.type === "blur") {
    return {
      type: "blur",
      ...(typeof record.intensity === "number" ? { intensity: record.intensity } : {}),
      ...(typeof record.tintColor === "string" ? { tintColor: record.tintColor } : {}),
      ...(typeof record.opacity === "number" ? { opacity: record.opacity } : {}),
    };
  }
  return undefined;
}

function readPackageSelectorSubtitleColorProp(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }
  if (
    value === "{theme.colors.muted}" ||
    value === "{theme.colors.mutedText}" ||
    value === "{theme.colors.secondary}"
  ) {
    return undefined;
  }
  return value;
}
