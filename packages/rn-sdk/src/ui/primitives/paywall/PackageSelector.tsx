import React, { useEffect, useRef, useState } from "react";
import { Platform, type LayoutChangeEvent } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import {
  normalizePackageSelectorProps,
  type NormalizedPackageSelectorProps,
} from "@onborn/sdk-contracts";
import { useResponsiveScale } from "../../responsive";
import { ComponentGradientBg } from "../background";
import { SelectionIndicator } from "./SelectionIndicator";
import type {
  PackageSelectorProps,
  PaywallPackageWithProduct,
  PaywallRenderContext,
} from "./types";
import {
  formatPackagePriceTemplate,
  isBuilderCanvasPreview,
  isPackageSelected,
  packagesForSelector,
  paywallTemplateVars,
  resolvePackageCardBackground,
  resolvePackageSubtitle,
  resolvePackageTitle,
} from "./utils";

const DEFAULT_PACKAGE_SELECTOR_BADGE = "Best value";

export function PackageSelector({ ctx, rawType, props }: PackageSelectorProps) {
  const selector = normalizePackageSelectorProps(rawType, props);
  const offering = ctx.options?.paywallContext?.offering;
  const items = packagesForSelector(ctx.options, selector);
  const defaultSelectedPackageId = resolveDefaultSelectorPackageId(
    selector,
    items,
    offering?.defaultPackageId,
  );
  const selectedPackageId =
    ctx.options?.paywallContext?.selectedPackageId ?? defaultSelectedPackageId;

  if (selector.layout === "grid") {
    return (
      <PackageSelectorGrid
        ctx={ctx}
        items={items}
        selector={selector}
        selectedPackageId={selectedPackageId}
        defaultSelectedPackageId={defaultSelectedPackageId}
      />
    );
  }

  return (
    <YStack width="100%" gap={selector.gap ?? 10}>
      {items.map((item, index) => (
        <PackageRow
          key={item.pkg.id}
          ctx={ctx}
          item={item}
          index={index}
          selector={selector}
          selectedPackageId={selectedPackageId}
          defaultSelectedPackageId={defaultSelectedPackageId}
        />
      ))}
    </YStack>
  );
}

function resolveDefaultSelectorPackageId(
  selector: NormalizedPackageSelectorProps,
  items: PaywallPackageWithProduct[],
  offeringDefaultPackageId: string | undefined,
): string | undefined {
  const itemIds = new Set(items.map((item) => item.pkg.id));
  if (selector.selectedPackageId && itemIds.has(selector.selectedPackageId)) {
    return selector.selectedPackageId;
  }
  if (offeringDefaultPackageId && itemIds.has(offeringDefaultPackageId)) {
    return offeringDefaultPackageId;
  }
  return items.find((item) => item.pkg.isHighlighted)?.pkg.id ?? items[0]?.pkg.id;
}

function PackageRow({
  ctx,
  item,
  index,
  selector,
  selectedPackageId,
  defaultSelectedPackageId,
}: {
  ctx: PaywallRenderContext;
  item: PaywallPackageWithProduct;
  index: number;
  selector: NormalizedPackageSelectorProps;
  selectedPackageId: string | undefined;
  defaultSelectedPackageId: string | undefined;
}) {
  const { flowTheme, options, resolveColor } = ctx;
  const selected = isPackageSelected(item, selectedPackageId, index);
  const label =
    selector.title || resolvePackageTitle(item, `Package ${index + 1}`);
  const description = selector.subtitle || resolvePackageSubtitle(item, "");
  const badgeText = resolvePackageBadgeText(selector, item);
  const priceVars = paywallTemplateVars(item);
  const priceFallback =
    selector.priceFallback ??
    (priceVars.price
      ? `${priceVars.price}${priceVars.period ? ` / ${priceVars.period}` : ""}`
      : "$9.99 / month");
  const packagePrice =
    selector.showPrice === false
      ? ""
      : formatPackagePriceTemplate(selector.priceTemplate, item, priceFallback);
  const isCompact = selector.layout === "compact";
  const isGridLayout = selector.layout === "grid";
  const borderRadius =
    selector.borderRadius ?? (isCompact ? 12 : isGridLayout ? 16 : 18);
  const padding = selector.padding ?? (isCompact ? 12 : isGridLayout ? 14 : 16);
  const gap = selector.gap ?? (isCompact ? 8 : 10);
  const borderWidth = selector.borderWidth ?? 2;
  const selectedBorderColor =
    resolveColor(selector.selectedBorderColor) ??
    flowTheme.colors.primary ??
    "#5F6FFF";
  const selectionColor =
    resolveColor(selector.selectionColor) ?? selectedBorderColor;
  const defaultBorder =
    resolveColor(selector.borderColor) ?? "rgba(148, 163, 184, 0.28)";
  const defaultSelected = isPackageSelected(
    item,
    defaultSelectedPackageId,
    index,
  );
  const showBadge = shouldRenderPackageBadge({
    selector,
    defaultSelected,
    badgeText,
  });
  const showDescription =
    selector.showDescription !== false && Boolean(description) && !isGridLayout;
  const badgeBg =
    resolveColor(selector.badgeBg) ?? flowTheme.colors.primary ?? "#5F6FFF";
  const badgeColor =
    resolveColor(selector.badgeColor) ?? flowTheme.colors.neutral ?? "#FFFFFF";
  const subtitleColor =
    resolveColor(selector.subtitleColor) ??
    flowTheme.colors.primary ??
    "#111827";
  const indicator = selector.selectedIndicator ?? "border";
  const indicatorPosition =
    selector.indicatorPosition ?? (isGridLayout ? "trailing" : "leading");
  const showIndicator = indicator !== "border";
  const trailingIndicator = showIndicator && indicatorPosition === "trailing";
  const leadingIndicator = showIndicator && indicatorPosition === "leading";
  const neutralFallback = flowTheme.colors.neutral ?? "#171B22";
  const { solidColor, gradientBg } = resolvePackageCardBackground(
    ctx,
    selector.cardBg,
    neutralFallback,
  );
  const titleColor =
    resolveColor(selector.color) ?? flowTheme.colors.primary ?? "#111827";
  const priceColor = resolveColor(selector.priceColor) ?? titleColor;
  const titleFontSize = selector.fontSize ?? (isCompact ? 15 : 16);
  const priceFontSize =
    selector.priceFontSize ?? Math.max(12, titleFontSize - 1);
  const priceFontFamily =
    selector.priceFontFamily ??
    selector.fontFamily ??
    flowTheme.fonts.headline ??
    ctx.layoutFontFamily;
  const priceFontWeight = selector.priceFontWeight ?? "800";
  const badgeFontSize = selector.badgeFontSize ?? 11;
  const badgeHeight = badgeFontSize + 8;
  const badgeOffset = badgeHeight / 2;

  return (
    <YStack
      width="100%"
      position="relative"
      overflow="visible"
      borderWidth={borderWidth}
      borderColor={selected ? selectedBorderColor : defaultBorder}
      backgroundColor={solidColor}
      borderRadius={borderRadius}
      opacity={options?.paywallContext?.purchasing ? 0.72 : 1}
      onPress={
        isBuilderCanvasPreview(options)
          ? undefined
          : () => options?.paywallContext?.onSelectPackage?.(item.pkg.id)
      }
    >
      <ComponentGradientBg bg={gradientBg} radius={borderRadius} />
      <SelectionOverlay
        selected={selected}
        color={selectionColor}
        radius={borderRadius}
      />
      {showBadge ? (
        <PackageBadgeOverlay
          text={badgeText}
          selector={selector}
          padding={padding}
          offset={badgeOffset}
          bg={badgeBg}
          color={badgeColor}
          fontSize={badgeFontSize}
          fontFamily={
            selector.badgeFontFamily ??
            flowTheme.fonts.label ??
            flowTheme.fonts.body ??
            ctx.layoutFontFamily
          }
          fontWeight={selector.badgeFontWeight ?? "800"}
        />
      ) : null}
      <YStack width="100%" gap={gap} padding={padding}>
        <XStack width="100%" alignItems="center" gap={12}>
          {leadingIndicator ? (
            <SelectionIndicator
              indicator={indicator}
              selected={selected}
              color={selectionColor}
            />
          ) : null}
          <YStack flex={1} minWidth={0} gap={4}>
            <PackageRowCopy
              label={label}
              packagePrice={packagePrice}
              description={showDescription ? description : ""}
              titleColor={titleColor}
              priceColor={priceColor}
              titleFontSize={titleFontSize}
              priceFontSize={priceFontSize}
              priceFontFamily={priceFontFamily}
              priceFontWeight={priceFontWeight}
              fontFamily={
                selector.fontFamily ??
                flowTheme.fonts.headline ??
                ctx.layoutFontFamily
              }
              subtitleFontFamily={
                selector.subtitleFontFamily ??
                flowTheme.fonts.body ??
                ctx.layoutFontFamily
              }
              fontWeight={selector.fontWeight ?? "800"}
              subtitleColor={subtitleColor}
              subtitleFontSize={selector.subtitleFontSize}
              subtitleFontWeight={selector.subtitleFontWeight}
            />
          </YStack>
          {trailingIndicator ? (
            <SelectionIndicator
              indicator={indicator}
              selected={selected}
              color={selectionColor}
            />
          ) : null}
        </XStack>
      </YStack>
    </YStack>
  );
}

function PackageRowCopy({
  label,
  packagePrice,
  description,
  titleColor,
  priceColor,
  titleFontSize,
  priceFontSize,
  priceFontFamily,
  priceFontWeight,
  fontFamily,
  subtitleFontFamily,
  fontWeight,
  subtitleColor,
  subtitleFontSize,
  subtitleFontWeight,
}: {
  label: string;
  packagePrice: string;
  description: string;
  titleColor: string;
  priceColor: string;
  titleFontSize: number;
  priceFontSize: number;
  priceFontFamily?: string;
  priceFontWeight: string;
  fontFamily?: string;
  subtitleFontFamily?: string;
  fontWeight: string;
  subtitleColor?: string;
  subtitleFontSize?: number;
  subtitleFontWeight?: string;
}) {
  return (
    <YStack width="100%" gap={4}>
      <XStack
        width="100%"
        alignItems="flex-start"
        justifyContent="space-between"
        gap={12}
      >
        <Text
          flex={1}
          minWidth={0}
          color={titleColor}
          fontSize={titleFontSize}
          fontFamily={fontFamily}
          fontWeight={fontWeight}
        >
          {label}
        </Text>
        {packagePrice ? (
          <Text
            color={priceColor}
            fontSize={priceFontSize}
            fontFamily={priceFontFamily}
            fontWeight={priceFontWeight}
            textAlign="right"
          >
            {packagePrice}
          </Text>
        ) : null}
      </XStack>
      {description ? (
        <Text
          color={subtitleColor}
          fontSize={subtitleFontSize ?? 13}
          fontFamily={subtitleFontFamily}
          fontWeight={subtitleFontWeight}
        >
          {description}
        </Text>
      ) : null}
    </YStack>
  );
}

function shouldRenderPackageBadge({
  selector,
  defaultSelected,
  badgeText,
}: {
  selector: NormalizedPackageSelectorProps;
  defaultSelected: boolean;
  badgeText: string | undefined;
}) {
  if (selector.showBadge !== true || !badgeText) {
    return false;
  }
  return defaultSelected;
}

function resolvePackageBadgeText(
  selector: NormalizedPackageSelectorProps,
  item: PaywallPackageWithProduct,
): string | undefined {
  return (
    readNonEmptyString(selector.badge) ??
    readNonEmptyString(item.pkg.badge) ??
    DEFAULT_PACKAGE_SELECTOR_BADGE
  );
}

function readNonEmptyString(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

function PackageBadgeOverlay({
  text,
  selector,
  padding,
  offset,
  bg,
  color,
  fontSize,
  fontFamily,
  fontWeight,
}: {
  text: string | undefined;
  selector: NormalizedPackageSelectorProps;
  padding: number;
  offset: number;
  bg: string;
  color: string;
  fontSize: number;
  fontFamily?: string;
  fontWeight: string;
}) {
  if (!text) {
    return null;
  }
  const position = selector.badgePosition ?? "center";
  const justifyContent =
    position === "left"
      ? "flex-start"
      : position === "right"
        ? "flex-end"
        : "center";

  return (
    <XStack
      pointerEvents="none"
      position="absolute"
      top={-offset}
      left={0}
      right={0}
      zIndex={4}
      justifyContent={justifyContent}
      paddingHorizontal={position === "center" ? 0 : Math.max(8, padding)}
    >
      <Text
        borderRadius={999}
        paddingHorizontal={8}
        paddingVertical={4}
        backgroundColor={bg}
        color={color}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fontWeight={fontWeight}
        numberOfLines={1}
      >
        {text}
      </Text>
    </XStack>
  );
}

function SelectionOverlay({
  selected,
  color,
  radius,
}: {
  selected: boolean;
  color: string;
  radius: number;
}) {
  if (!selected) {
    return null;
  }
  return (
    <YStack
      pointerEvents="none"
      position="absolute"
      top={0}
      right={0}
      bottom={0}
      left={0}
      borderRadius={radius}
      backgroundColor={color}
      opacity={0.16}
    />
  );
}

function PackageSelectorGrid({
  ctx,
  items,
  selector,
  selectedPackageId,
  defaultSelectedPackageId,
}: {
  ctx: PaywallRenderContext;
  items: PaywallPackageWithProduct[];
  selector: NormalizedPackageSelectorProps;
  selectedPackageId: string | undefined;
  defaultSelectedPackageId: string | undefined;
}) {
  const { metrics, scaleSpace } = useResponsiveScale();
  const gap = selector.gap ?? 10;
  const layoutHorizontalPadding =
    ctx.options?.layout?.spacing.paddingHorizontal ?? 24;
  const estimatedContentWidth = Math.max(
    0,
    metrics.width - scaleSpace(layoutHorizontalPadding) * 2,
  );
  const [containerWidth, setContainerWidth] = useState(
    estimatedContentWidth || 320,
  );
  const measuredWidthRef = useRef(false);

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    if (width <= 0) {
      return;
    }
    if (metrics.fixed || isBuilderCanvasPreview(ctx.options)) {
      return;
    }
    if (Platform.OS === "web") {
      if (measuredWidthRef.current) {
        return;
      }
      measuredWidthRef.current = true;
      setContainerWidth(Math.min(width, estimatedContentWidth || width));
      return;
    }
    setContainerWidth(width);
  };

  useEffect(() => {
    measuredWidthRef.current = false;
    setContainerWidth(estimatedContentWidth || 320);
  }, [
    estimatedContentWidth,
    items.length,
    metrics.height,
    metrics.width,
    selector.gap,
  ]);

  const tileSize = Math.max(0, Math.floor((containerWidth - gap) / 2));
  const rows: PaywallPackageWithProduct[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    rows.push(items.slice(index, index + 2));
  }

  return (
    <YStack width="100%" gap={gap} onLayout={handleLayout}>
      {rows.map((row, rowIndex) => (
        <XStack key={`package-grid-row-${rowIndex}`} width="100%" gap={gap}>
          {row.map((item, columnIndex) => (
            <PackageGridTile
              key={item.pkg.id}
              ctx={ctx}
              item={item}
              index={rowIndex * 2 + columnIndex}
              selector={selector}
              selectedPackageId={selectedPackageId}
              defaultSelectedPackageId={defaultSelectedPackageId}
              tileSize={row.length === 1 ? containerWidth : tileSize}
            />
          ))}
        </XStack>
      ))}
    </YStack>
  );
}

function PackageGridTile({
  ctx,
  item,
  index,
  selector,
  selectedPackageId,
  defaultSelectedPackageId,
  tileSize,
}: {
  ctx: PaywallRenderContext;
  item: PaywallPackageWithProduct;
  index: number;
  selector: NormalizedPackageSelectorProps;
  selectedPackageId: string | undefined;
  defaultSelectedPackageId: string | undefined;
  tileSize: number;
}) {
  const { flowTheme, options, resolveColor } = ctx;
  const selected = isPackageSelected(item, selectedPackageId, index);
  const label =
    selector.title || resolvePackageTitle(item, `Package ${index + 1}`);
  const description = selector.subtitle || resolvePackageSubtitle(item, "");
  const badgeText = resolvePackageBadgeText(selector, item);
  const priceVars = paywallTemplateVars(item);
  const priceFallback =
    selector.priceFallback ??
    (priceVars.price
      ? `${priceVars.price}${priceVars.period ? ` / ${priceVars.period}` : ""}`
      : "$9.99 / month");
  const packagePrice =
    selector.showPrice === false
      ? ""
      : formatPackagePriceTemplate(selector.priceTemplate, item, priceFallback);
  const borderRadius = selector.borderRadius ?? 16;
  const padding = selector.padding ?? 14;
  const borderWidth = selector.borderWidth ?? 2;
  const selectedBorderColor =
    resolveColor(selector.selectedBorderColor) ??
    flowTheme.colors.primary ??
    "#5F6FFF";
  const selectionColor =
    resolveColor(selector.selectionColor) ?? selectedBorderColor;
  const defaultBorder =
    resolveColor(selector.borderColor) ?? "rgba(148, 163, 184, 0.28)";
  const defaultSelected = isPackageSelected(
    item,
    defaultSelectedPackageId,
    index,
  );
  const showBadge = shouldRenderPackageBadge({
    selector,
    defaultSelected,
    badgeText,
  });
  const showDescription =
    selector.showDescription !== false && Boolean(description);
  const badgeBg =
    resolveColor(selector.badgeBg) ?? flowTheme.colors.primary ?? "#5F6FFF";
  const badgeColor =
    resolveColor(selector.badgeColor) ?? flowTheme.colors.neutral ?? "#FFFFFF";
  const subtitleColor =
    resolveColor(selector.subtitleColor) ??
    flowTheme.colors.primary ??
    "#111827";
  const indicator = selector.selectedIndicator ?? "border";
  const showIndicator = indicator !== "border";
  const indicatorPosition = selector.indicatorPosition ?? "trailing";
  const neutralFallback = flowTheme.colors.neutral ?? "#171B22";
  const { solidColor, gradientBg } = resolvePackageCardBackground(
    ctx,
    selector.cardBg,
    neutralFallback,
  );
  const titleColor =
    resolveColor(selector.color) ?? flowTheme.colors.primary ?? "#111827";
  const priceColor = resolveColor(selector.priceColor) ?? titleColor;
  const titleFontSize = selector.fontSize ?? 15;
  const priceFontSize =
    selector.priceFontSize ?? Math.max(12, titleFontSize - 1);
  const priceFontFamily =
    selector.priceFontFamily ??
    selector.fontFamily ??
    flowTheme.fonts.headline ??
    ctx.layoutFontFamily;
  const priceFontWeight = selector.priceFontWeight ?? "700";
  const fontFamily =
    selector.fontFamily ?? flowTheme.fonts.headline ?? ctx.layoutFontFamily;
  const badgeFontSize = selector.badgeFontSize ?? 10;
  const badgeHeight = badgeFontSize + 8;
  const badgeOffset = badgeHeight / 2;

  return (
    <YStack
      width={tileSize > 0 ? tileSize : "48%"}
      height={tileSize > 0 ? tileSize : undefined}
      aspectRatio={tileSize > 0 ? undefined : 1}
      position="relative"
      overflow="visible"
      borderWidth={borderWidth}
      borderColor={selected ? selectedBorderColor : defaultBorder}
      backgroundColor={solidColor}
      borderRadius={borderRadius}
      opacity={options?.paywallContext?.purchasing ? 0.72 : 1}
      onPress={
        isBuilderCanvasPreview(options)
          ? undefined
          : () => options?.paywallContext?.onSelectPackage?.(item.pkg.id)
      }
    >
      <ComponentGradientBg bg={gradientBg} radius={borderRadius} />
      <SelectionOverlay
        selected={selected}
        color={selectionColor}
        radius={borderRadius}
      />
      {showBadge ? (
        <PackageBadgeOverlay
          text={badgeText}
          selector={selector}
          padding={padding}
          offset={badgeOffset}
          bg={badgeBg}
          color={badgeColor}
          fontSize={badgeFontSize}
          fontFamily={
            selector.badgeFontFamily ??
            flowTheme.fonts.label ??
            flowTheme.fonts.body ??
            ctx.layoutFontFamily
          }
          fontWeight={selector.badgeFontWeight ?? "800"}
        />
      ) : null}
      {showIndicator ? (
        <XStack
          position="absolute"
          top={padding}
          left={indicatorPosition === "leading" ? padding : undefined}
          right={indicatorPosition === "trailing" ? padding : undefined}
          zIndex={2}
          pointerEvents="none"
        >
          <SelectionIndicator
            indicator={indicator}
            selected={selected}
            color={selectionColor}
          />
        </XStack>
      ) : null}
      <YStack
        flex={1}
        width="100%"
        padding={padding}
        paddingTop={showIndicator ? padding + 24 : padding}
        alignItems="center"
        justifyContent="center"
        gap={8}
      >
        <Text
          color={titleColor}
          fontSize={titleFontSize}
          fontFamily={fontFamily}
          fontWeight={selector.fontWeight ?? "800"}
          textAlign="center"
          numberOfLines={2}
        >
          {label}
        </Text>
        {showDescription ? (
          <Text
            color={subtitleColor}
            fontSize={
              selector.subtitleFontSize ?? Math.max(11, titleFontSize - 3)
            }
            fontFamily={
              selector.subtitleFontFamily ??
              flowTheme.fonts.body ??
              ctx.layoutFontFamily
            }
            fontWeight={selector.subtitleFontWeight}
            textAlign="center"
            numberOfLines={2}
          >
            {description}
          </Text>
        ) : null}
        {packagePrice ? (
          <Text
            color={priceColor}
            fontSize={priceFontSize}
            fontFamily={priceFontFamily}
            fontWeight={priceFontWeight}
            textAlign="center"
            numberOfLines={2}
          >
            {packagePrice}
          </Text>
        ) : null}
      </YStack>
    </YStack>
  );
}
