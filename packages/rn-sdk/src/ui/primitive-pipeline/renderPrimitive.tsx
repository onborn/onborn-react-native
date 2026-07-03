import React from "react";
import { XStack, YStack } from "tamagui";
import { Packages } from "../primitives/placeholders";
import {
  AgePicker,
  AnimatedAsset,
  Avatar,
  Badge,
  Carousel,
  CarouselPagination,
  BackButton,
  CTAButton,
  Features,
  HeightPicker,
  Icon,
  Image,
  Input,
  Loading,
  ProgressBar,
  Quiz,
  SkipButton,
  Subtitle,
  TestimonialCard,
  Title,
  Toggle,
  WeightPicker,
} from "../primitives";
import {
  ComponentGradientBg,
  resolveSolidBg,
  type ComponentBg,
} from "../primitives/background";
import { isThemeLinkedCtaVariant } from "@onborn/sdk-contracts";
import {
  DEFAULT_FLOW_THEME,
  resolveFlowTheme,
  resolveThemeButtonStyle,
  resolveThemeToken,
} from "../theme/flowTheme";
import { renderPaywallPrimitive } from "./paywallPrimitiveRender";
import { toSelectablePrimitiveId, wrapSelectableNode } from "./selectable";
import type {
  PrimitiveInstance,
  PrimitiveRenderOptions,
  PrimitiveValue,
} from "./types";

type EmbeddedPrimitive = {
  type?: unknown;
  visible?: unknown;
  visibility?: unknown;
  props?: unknown;
};

type StackPrimitiveProps = {
  bg?: ComponentBg;
  radius?: number;
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  height?: number;
  gap?: number;
  shadow?: "none" | "sm" | "md" | "lg";
  borderColor?: string;
  borderWidth?: number;
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  justifyContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around";
  centerChildIndex?: number;
  overlay?: boolean;
  overlayPlacement?: "top" | "bottom";
  children?: EmbeddedPrimitive[];
};

function renderEmbeddedChildren(
  children: EmbeddedPrimitive[] | undefined,
  options?: PrimitiveRenderOptions,
  direction: "x" | "y" = "y",
  parentId?: string,
  parentVisibility?: PrimitiveInstance["visibility"],
  centerChildIndex?: number,
): React.ReactNode[] {
  if (!Array.isArray(children)) {
    return [];
  }

  const out: React.ReactNode[] = [];
  const visibleChildCount = children.filter(
    (child) =>
      child &&
      child.visible !== false &&
      typeof child.type === "string" &&
      child.props &&
      typeof child.props === "object" &&
      !Array.isArray(child.props),
  ).length;
  children.forEach((child, index) => {
    if (
      !child ||
      child.visible === false ||
      typeof child.type !== "string" ||
      !child.props ||
      typeof child.props !== "object" ||
      Array.isArray(child.props)
    ) {
      return;
    }

    const node = renderPrimitive(
      {
        id: parentId ? `${parentId}::${index}` : undefined,
        type: child.type,
        slot: "content",
        order: index,
        visible: true,
        visibility: isPrimitiveVisibility(child.visibility)
          ? child.visibility
          : parentVisibility,
        props: child.props as Record<string, unknown>,
      },
      options,
    );

    if (node == null) {
      return;
    }

    const key = `${child.type}-${index}`;
    const childId = parentId ? `${parentId}::${index}` : key;
    const isFillableChild =
      child.type === "progress_bar" ||
      child.type === "input" ||
      child.type === "cta_button" ||
      child.type === "skip_button" ||
      child.type === "title" ||
      child.type === "subtitle" ||
      child.type === "quiz" ||
      child.type === "features" ||
      child.type === "testimonial_card" ||
      child.type === "x_stack" ||
      child.type === "y_stack";
    const shouldUseNaturalInlineSize =
      direction === "x" &&
      (child.type === "skip_button" ||
        (child.type === "cta_button" &&
          (child.props as Record<string, unknown>).fullWidth === false));
    const shouldUseFlexibleInlineSize =
      direction === "x" && isFillableChild && !shouldUseNaturalInlineSize;
    const isCenteredChild =
      direction === "x" &&
      typeof centerChildIndex === "number" &&
      index === centerChildIndex;
    const shouldDistributeInlineSize =
      direction === "x" &&
      isFillableChild &&
      !isCenteredChild &&
      !shouldUseNaturalInlineSize &&
      visibleChildCount > 1;
    const shouldUseInlineWrapper =
      direction === "x" &&
      (shouldUseNaturalInlineSize ||
        (isFillableChild && visibleChildCount === 1));
    const inlineChildWidth =
      shouldDistributeInlineSize && !shouldUseFlexibleInlineSize
        ? `${100 / visibleChildCount}%`
        : undefined;
    const selectableNode = wrapSelectableNode(
      key,
      childId,
      node,
      options,
    );

    const renderedNode = inlineChildWidth ? (
      <XStack key={key} width={inlineChildWidth} flexShrink={1} minWidth={0}>
        {selectableNode}
      </XStack>
    ) : shouldUseInlineWrapper ? (
      <XStack key={key} flexShrink={1} maxWidth="100%" minWidth={0}>
        {selectableNode}
      </XStack>
    ) : shouldUseFlexibleInlineSize ? (
      <XStack key={key} flex={1} flexShrink={1} minWidth={0}>
        {selectableNode}
      </XStack>
    ) : isFillableChild ? (
      <YStack key={key} width="100%">
        {selectableNode}
      </YStack>
    ) : (
      selectableNode
    );

    if (isCenteredChild) {
      out.push(
        <XStack
          key={key}
          position="absolute"
          left={0}
          right={0}
          top={0}
          bottom={0}
          alignItems="center"
          justifyContent="center"
          pointerEvents="box-none"
        >
          {renderedNode}
        </XStack>,
      );
      return;
    }

    out.push(renderedNode);
  });
  return out;
}

function readPrimitiveValueId(
  primitive: PrimitiveInstance,
  fallbackType = primitive.type,
): string {
  const configuredId = primitive.props.id;
  if (typeof configuredId === "string" && configuredId.trim().length > 0) {
    return configuredId.trim();
  }
  return primitive.id ?? fallbackType;
}

function interpolateText(
  value: unknown,
  values: Record<string, PrimitiveValue> | undefined,
  preserveEmptyVariableTokens = false,
): string {
  if (typeof value !== "string") {
    return "";
  }
  if (!values) {
    return value;
  }

  return value.replace(/\{\{\s*([a-zA-Z0-9_.:-]+)\s*\}\}/g, (_match, key) => {
    const replacement = values[key];
    if (
      preserveEmptyVariableTokens &&
      (replacement === undefined || replacement === "")
    ) {
      return `{{${key}}}`;
    }
    if (
      typeof replacement === "string" ||
      typeof replacement === "number" ||
      typeof replacement === "boolean"
    ) {
      return String(replacement);
    }
    return "";
  });
}

function resolveStackShadowProps(shadow: StackPrimitiveProps["shadow"]) {
  switch (shadow) {
    case "sm":
      return {
        shadowColor: "#000000",
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      };
    case "lg":
      return {
        shadowColor: "#000000",
        shadowOpacity: 0.22,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 14 },
        elevation: 8,
      };
    case "md":
      return {
        shadowColor: "#000000",
        shadowOpacity: 0.16,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
      };
    case "none":
    default:
      return {};
  }
}

function resolveStackBorderProps(
  stackProps: StackPrimitiveProps,
  resolveColor: (value: string | undefined) => string | undefined,
) {
  const borderColor = resolveColor(stackProps.borderColor);
  const borderWidth =
    typeof stackProps.borderWidth === "number" && stackProps.borderWidth > 0
      ? stackProps.borderWidth
      : undefined;
  if (!borderColor || !borderWidth) {
    return {};
  }
  return { borderColor, borderWidth };
}

function isPrimitiveVisibility(
  value: unknown,
): value is PrimitiveInstance["visibility"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (
    record.mode !== "all" &&
    record.mode !== "include_steps" &&
    record.mode !== "exclude_steps"
  ) {
    return false;
  }
  return (
    !Array.isArray(record.stepIds) ||
    record.stepIds.every((stepId) => typeof stepId === "string")
  );
}

export function renderPrimitive(
  p: PrimitiveInstance,
  options?: PrimitiveRenderOptions,
): React.ReactNode {
  if (!isVisibleForCurrentStep(p.visibility, options?.currentStepId)) {
    return null;
  }
  const scaleRadius = options?.responsive?.scaleRadius ?? identityScale;
  const scaleSpace = options?.responsive?.scaleSpace ?? identityScale;
  const props = p.props;
  const flowTheme = resolveFlowTheme(options?.flowTheme);
  const resolveColor = (value: string | undefined) =>
    resolveThemeToken(value, flowTheme);
  const resolveBg = (
    value: ComponentBg | undefined,
  ): ComponentBg | undefined =>
    typeof value === "string" ? resolveColor(value) : value;
  const resolveThemedComponentBg = (
    value: ComponentBg | undefined,
    fallback: string = flowTheme.colors.secondary ?? "#171B22",
  ): ComponentBg | undefined => {
    if (value && typeof value === "object") {
      return value;
    }
    const resolved = resolveColor(value);
    if (
      resolved === "transparent" ||
      resolved === "#00000000" ||
      resolved === "rgba(0, 0, 0, 0)" ||
      resolved === "rgba(0,0,0,0)"
    ) {
      return resolved;
    }
    return resolved ?? fallback;
  };
  const withLayoutFontFamily = <TProps extends { fontFamily?: unknown }>(
    primitiveProps: TProps,
  ) => ({
    ...primitiveProps,
    fontFamily: primitiveProps.fontFamily ?? options?.layoutFontFamily,
  });
  const resolvePrimitiveFontFamily = (value: unknown) => {
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };
  const withThemeFont = <
    TProps extends { fontFamily?: unknown; color?: unknown },
  >(
    primitiveProps: TProps,
    role: "headline" | "body" | "label",
    defaultColor?: string,
  ) => ({
    ...primitiveProps,
    color: resolveColor(
      typeof primitiveProps.color === "string"
        ? primitiveProps.color
        : defaultColor,
    ),
    fontFamily:
      resolvePrimitiveFontFamily(primitiveProps.fontFamily) ??
      flowTheme.fonts[role] ??
      options?.layoutFontFamily,
  });

  switch (p.type) {
    case "title":
      return (
        <Title
          {...withThemeFont(
            {
              ...(props as React.ComponentProps<typeof Title>),
              text: interpolateText(
                props.text,
                options?.variableValues,
                options?.preserveEmptyVariableTokens,
              ),
            },
            "headline",
            flowTheme.colors.primary,
          )}
        />
      );
    case "subtitle":
      return (
        <Subtitle
          {...withThemeFont(
            {
              ...(props as React.ComponentProps<typeof Subtitle>),
              text: interpolateText(
                props.text,
                options?.variableValues,
                options?.preserveEmptyVariableTokens,
              ),
            },
            "body",
            flowTheme.colors.secondary,
          )}
        />
      );
    case "image":
      return <Image {...(props as React.ComponentProps<typeof Image>)} />;
    case "animated_asset": {
      const animated = props as React.ComponentProps<typeof AnimatedAsset>;
      return <AnimatedAsset {...animated} bg={resolveBg(animated.bg)} />;
    }
    case "cta_button": {
      const cta = props as React.ComponentProps<typeof CTAButton>;
      const ctaAction = cta.action ?? "next";
      const isPaywallPurchaseAction =
        Boolean(options?.paywallContext?.paywall) &&
        (ctaAction === "purchase" ||
          ctaAction === "start_trial" ||
          ctaAction === "next");
      const isPurchasing =
        isPaywallPurchaseAction && Boolean(options?.paywallContext?.purchasing);
      const isActionDisabled = Boolean(
        options?.isCtaActionDisabled?.(ctaAction),
      );
      const themeButton = resolveThemeButtonStyle(cta.variant, flowTheme);
      const usesThemeButtonStyles = isThemeLinkedCtaVariant(cta.variant);
      const pickThemeLinkedColor = (
        value: string | undefined,
        themeValue: string | undefined,
      ) => {
        if (typeof value === "string" && value.length > 0) {
          return resolveColor(value);
        }
        if (usesThemeButtonStyles) {
          return themeValue;
        }
        return resolveColor(value) ?? themeValue;
      };
      const pickThemeLinkedNumber = (
        value: number | undefined,
        themeValue: number | undefined,
      ) => value ?? themeValue;
      const pickThemeLinkedFontFamily = () =>
        cta.fontFamily ??
        themeButton?.fontFamily ??
        options?.layoutFontFamily ??
        flowTheme.fonts.label;
      return (
        <CTAButton
          {...withLayoutFontFamily({
            ...cta,
            bg: pickThemeLinkedColor(cta.bg, themeButton?.bg),
            color: pickThemeLinkedColor(cta.color, themeButton?.color),
            borderColor: pickThemeLinkedColor(
              cta.borderColor,
              themeButton?.borderColor,
            ),
            borderWidth: pickThemeLinkedNumber(
              cta.borderWidth,
              themeButton?.borderWidth,
            ),
            borderRadius: pickThemeLinkedNumber(
              cta.borderRadius,
              themeButton?.radius,
            ),
            fontFamily: pickThemeLinkedFontFamily(),
            fontWeight: cta.fontWeight ?? themeButton?.fontWeight,
            fontSize: pickThemeLinkedNumber(
              cta.fontSize,
              themeButton?.fontSize,
            ),
            iconColor: pickThemeLinkedColor(
              cta.iconColor,
              cta.color ?? themeButton?.color,
            ),
          })}
          disabled={cta.disabled || isPurchasing || isActionDisabled}
          disableInteractionState={options?.disableInteractionState}
          onPress={
            options?.onPrimitivePress && p.id
              ? () =>
                  options.onPrimitivePress?.(
                    toSelectablePrimitiveId(p.id ?? p.type, options),
                  )
              : (cta.onPress ??
                (() => {
                  if (isPaywallPurchaseAction && !options?.onCtaPress) {
                    options?.paywallContext?.onPurchaseSelectedPackage?.();
                    return;
                  }
                  options?.onCtaPress?.(ctaAction);
                }))
          }
        />
      );
    }
    case "back_button": {
      const back = props as React.ComponentProps<typeof BackButton>;
      const themeBackButton = (flowTheme.components?.backButton ??
        DEFAULT_FLOW_THEME.components?.backButton)!;
      return (
        <BackButton
          {...withLayoutFontFamily({
            ...back,
            variant: back.variant ?? themeBackButton.variant,
            bg: resolveColor(back.bg) ?? resolveColor(themeBackButton.bg),
            color:
              resolveColor(back.color) ?? resolveColor(themeBackButton.color),
            borderColor:
              resolveColor(back.borderColor) ??
              resolveColor(themeBackButton.borderColor),
            borderWidth: back.borderWidth ?? themeBackButton.borderWidth,
            borderRadius: back.borderRadius ?? themeBackButton.borderRadius,
            paddingHorizontal:
              back.paddingHorizontal ?? themeBackButton.paddingHorizontal,
            paddingVertical:
              back.paddingVertical ?? themeBackButton.paddingVertical,
            iconSize: back.iconSize ?? themeBackButton.iconSize,
            fontSize: back.fontSize ?? themeBackButton.fontSize,
            fontFamily:
              back.fontFamily ??
              themeBackButton.fontFamily ??
              options?.layoutFontFamily ??
              flowTheme.fonts.label,
            fontWeight: back.fontWeight ?? themeBackButton.fontWeight,
            lineHeight: back.lineHeight ?? themeBackButton.lineHeight,
          })}
          disableInteractionState={options?.disableInteractionState}
          onPress={
            options?.onPrimitivePress && p.id
              ? () =>
                  options.onPrimitivePress?.(
                    toSelectablePrimitiveId(p.id ?? p.type, options),
                  )
              : (back.onPress ?? options?.onBackPress)
          }
        />
      );
    }
    case "skip_button": {
      const skip = props as React.ComponentProps<typeof SkipButton>;
      return (
        <SkipButton
          {...withLayoutFontFamily({
            ...skip,
            color: resolveColor(skip.color) ?? flowTheme.colors.secondary,
            bg: resolveColor(skip.bg) ?? skip.bg,
            borderColor: resolveColor(skip.borderColor),
            iconColor:
              resolveColor(skip.iconColor) ??
              resolveColor(skip.color) ??
              flowTheme.colors.secondary,
            fontFamily:
              skip.fontFamily ??
              options?.layoutFontFamily ??
              flowTheme.fonts.label,
          })}
          disableInteractionState={options?.disableInteractionState}
          onPress={
            options?.onPrimitivePress && p.id
              ? () =>
                  options.onPrimitivePress?.(
                    toSelectablePrimitiveId(p.id ?? p.type, options),
                  )
              : (skip.onPress ?? options?.onSkipPress)
          }
        />
      );
    }
    case "progress_bar": {
      const progressBar = props as React.ComponentProps<typeof ProgressBar>;
      const progressScope = options?.getProgressScope?.(p);
      return (
        <ProgressBar
          {...progressBar}
          indicatorBg={resolveColor(progressBar.indicatorBg)}
          trackBg={resolveColor(progressBar.trackBg)}
          animationKey={
            options?.persistProgressAnimation ? (p.id ?? p.type) : undefined
          }
          value={
            options?.getProgressValue?.(p) ??
            options?.progressValue ??
            (props.value as number | undefined)
          }
          activeStepIndex={progressScope?.index ?? options?.progressStepIndex}
          stepCount={progressScope?.count ?? options?.progressStepCount}
        />
      );
    }
    case "x_stack": {
      const stackProps = props as StackPrimitiveProps;
      return (
        <XStack
          width="100%"
          position="relative"
          overflow="hidden"
          backgroundColor={resolveSolidBg(
            resolveThemedComponentBg(stackProps.bg, "transparent"),
          )}
          borderRadius={
            typeof stackProps.radius === "number"
              ? scaleRadius(stackProps.radius)
              : undefined
          }
          paddingHorizontal={scaleSpace(
            stackProps.paddingHorizontal ?? stackProps.padding ?? 0,
          )}
          paddingVertical={scaleSpace(
            stackProps.paddingVertical ?? stackProps.padding ?? 0,
          )}
          minHeight={
            typeof stackProps.height === "number" && stackProps.height > 0
              ? scaleSpace(stackProps.height)
              : undefined
          }
          gap={
            typeof stackProps.gap === "number"
              ? scaleSpace(stackProps.gap)
              : undefined
          }
          alignItems={stackProps.alignItems}
          justifyContent={stackProps.justifyContent}
          {...resolveStackShadowProps(stackProps.shadow)}
          {...resolveStackBorderProps(stackProps, resolveColor)}
        >
          <ComponentGradientBg
            bg={resolveBg(stackProps.bg)}
            radius={
              typeof stackProps.radius === "number"
                ? scaleRadius(stackProps.radius)
                : 0
            }
          />
          {renderEmbeddedChildren(
            stackProps.children,
            options,
            "x",
            p.id,
            p.visibility,
            stackProps.centerChildIndex,
          )}
        </XStack>
      );
    }
    case "y_stack": {
      const stackProps = props as StackPrimitiveProps;
      return (
        <YStack
          width="100%"
          position="relative"
          overflow="hidden"
          backgroundColor={resolveSolidBg(
            resolveThemedComponentBg(stackProps.bg, "transparent"),
          )}
          borderRadius={
            typeof stackProps.radius === "number"
              ? scaleRadius(stackProps.radius)
              : undefined
          }
          paddingHorizontal={scaleSpace(
            stackProps.paddingHorizontal ?? stackProps.padding ?? 0,
          )}
          paddingVertical={scaleSpace(
            stackProps.paddingVertical ?? stackProps.padding ?? 0,
          )}
          minHeight={
            typeof stackProps.height === "number" && stackProps.height > 0
              ? scaleSpace(stackProps.height)
              : undefined
          }
          gap={
            typeof stackProps.gap === "number"
              ? scaleSpace(stackProps.gap)
              : undefined
          }
          alignItems={stackProps.alignItems}
          justifyContent={stackProps.justifyContent}
          {...resolveStackShadowProps(stackProps.shadow)}
          {...resolveStackBorderProps(stackProps, resolveColor)}
        >
          <ComponentGradientBg
            bg={resolveBg(stackProps.bg)}
            radius={
              typeof stackProps.radius === "number"
                ? scaleRadius(stackProps.radius)
                : 0
            }
          />
          {renderEmbeddedChildren(
            stackProps.children,
            options,
            "y",
            p.id,
            p.visibility,
          )}
        </YStack>
      );
    }
    case "input": {
      const inputProps = props as React.ComponentProps<typeof Input>;
      const inputId = readPrimitiveValueId(p);
      const inputValue = options?.inputValues?.[inputId];
      const themeInput = (flowTheme.components?.input ??
        DEFAULT_FLOW_THEME.components?.input)!;
      const builderSelectMode = Boolean(
        options?.disableInputEditing && options?.onPrimitivePress && p.id,
      );
      return (
        <Input
          {...withThemeFont(
            {
              ...inputProps,
              bg:
                resolveColor(inputProps.bg) ??
                resolveColor(themeInput.bg) ??
                themeInput.bg,
              color:
                resolveColor(inputProps.color) ??
                resolveColor(themeInput.color) ??
                themeInput.color,
              placeholderColor:
                resolveColor(inputProps.placeholderColor) ??
                resolveColor(themeInput.placeholderColor) ??
                themeInput.placeholderColor,
              borderColor:
                resolveColor(inputProps.borderColor) ??
                resolveColor(themeInput.borderColor) ??
                themeInput.borderColor,
              borderWidth: inputProps.borderWidth ?? themeInput.borderWidth,
              borderRadius: inputProps.borderRadius ?? themeInput.borderRadius,
              height: inputProps.height ?? themeInput.height,
              paddingHorizontal:
                inputProps.paddingHorizontal ?? themeInput.paddingHorizontal,
              fontSize: inputProps.fontSize ?? themeInput.fontSize,
              fontFamily:
                inputProps.fontFamily ??
                themeInput.fontFamily ??
                options?.layoutFontFamily ??
                flowTheme.fonts.body,
              fontWeight: inputProps.fontWeight ?? themeInput.fontWeight,
              lineHeight: inputProps.lineHeight ?? themeInput.lineHeight,
            },
            "body",
            resolveColor(themeInput.color) ?? flowTheme.colors.primary,
          )}
          value={
            typeof inputValue === "string"
              ? inputValue
              : (props.value as string | undefined)
          }
          editable={!options?.disableInputEditing}
          pointerEvents={builderSelectMode ? "none" : undefined}
          onChangeText={(text) => options?.onInputChange?.(inputId, text)}
          onSubmit={() => options?.onCtaPress?.("next")}
        />
      );
    }
    case "toggle": {
      const toggleProps = props as React.ComponentProps<typeof Toggle>;
      const primitiveId = p.id ?? p.type;
      const value =
        typeof options?.primitiveValues?.[primitiveId] === "boolean"
          ? (options.primitiveValues[primitiveId] as boolean)
          : toggleProps.value;
      return (
        <Toggle
          {...{
            ...toggleProps,
            value,
            trackColor:
              resolveColor(toggleProps.trackColor) ?? toggleProps.trackColor,
            thumbColor:
              resolveColor(toggleProps.thumbColor) ?? toggleProps.thumbColor,
            activeTrackColor:
              resolveColor(toggleProps.activeTrackColor) ??
              toggleProps.activeTrackColor,
            activeThumbColor:
              resolveColor(toggleProps.activeThumbColor) ??
              toggleProps.activeThumbColor,
          }}
          disableInteractionState={options?.disableInteractionState}
          onChange={(nextValue) => {
            if (options?.onPrimitivePress && p.id) {
              options.onPrimitivePress(
                toSelectablePrimitiveId(p.id ?? p.type, options),
              );
              return;
            }
            options?.onPrimitiveValueChange?.(primitiveId, nextValue);
            options?.onToggleChange?.({
              primitiveId,
              toggleId: toggleProps.id,
              value: nextValue,
            });
          }}
        />
      );
    }
    case "age_picker":
      return (
        <AgePicker
          {...(props as React.ComponentProps<typeof AgePicker>)}
          disableInteractionState={options?.disableInteractionState}
          layoutFontFamily={options?.layoutFontFamily}
          value={
            typeof options?.primitiveValues?.[p.id ?? p.type] === "number"
              ? (options.primitiveValues[p.id ?? p.type] as number)
              : (props.value as number | undefined)
          }
          onChange={(value) =>
            options?.onPrimitiveValueChange?.(p.id ?? p.type, value)
          }
        />
      );
    case "height_picker": {
      const heightPickerId = p.id ?? p.type;
      return (
        <HeightPicker
          {...(props as React.ComponentProps<typeof HeightPicker>)}
          disableInteractionState={options?.disableInteractionState}
          layoutFontFamily={options?.layoutFontFamily}
          unit={
            options?.primitiveValues?.[`${heightPickerId}__unit`] === "ft"
              ? "ft"
              : ((props as React.ComponentProps<typeof HeightPicker>).unit ??
                "cm")
          }
          value={
            typeof options?.primitiveValues?.[heightPickerId] === "number"
              ? (options.primitiveValues[heightPickerId] as number)
              : (props.value as number | undefined)
          }
          onChange={(value) =>
            options?.onPrimitiveValueChange?.(heightPickerId, value)
          }
          onUnitChange={(unit) =>
            options?.onPrimitiveValueChange?.(`${heightPickerId}__unit`, unit)
          }
        />
      );
    }
    case "weight_picker": {
      const weightPickerId = p.id ?? p.type;
      return (
        <WeightPicker
          {...(props as React.ComponentProps<typeof WeightPicker>)}
          disableInteractionState={options?.disableInteractionState}
          layoutFontFamily={options?.layoutFontFamily}
          unit={
            options?.primitiveValues?.[`${weightPickerId}__unit`] === "lb"
              ? "lb"
              : ((props as React.ComponentProps<typeof WeightPicker>).unit ??
                "kg")
          }
          value={
            typeof options?.primitiveValues?.[weightPickerId] === "number"
              ? (options.primitiveValues[weightPickerId] as number)
              : (props.value as number | undefined)
          }
          onChange={(value) =>
            options?.onPrimitiveValueChange?.(weightPickerId, value)
          }
          onUnitChange={(unit) =>
            options?.onPrimitiveValueChange?.(`${weightPickerId}__unit`, unit)
          }
        />
      );
    }
    case "carousel": {
      const carousel = props as React.ComponentProps<typeof Carousel>;
      return (
        <Carousel
          {...carousel}
          cardBg={resolveThemedComponentBg(carousel.cardBg)}
          titleFontFamily={
            carousel.titleFontFamily ??
            flowTheme.fonts.headline ??
            options?.layoutFontFamily
          }
          subtitleFontFamily={
            carousel.subtitleFontFamily ??
            flowTheme.fonts.body ??
            options?.layoutFontFamily
          }
          textFontFamily={
            carousel.textFontFamily ??
            flowTheme.fonts.body ??
            options?.layoutFontFamily
          }
        />
      );
    }
    case "carousel_pagination": {
      const pagination = props as React.ComponentProps<
        typeof CarouselPagination
      >;
      return (
        <CarouselPagination
          {...pagination}
          activeColor={
            resolveColor(pagination.activeColor) ??
            flowTheme.colors.primary ??
            "#111827"
          }
          inactiveColor={
            resolveColor(pagination.inactiveColor) ??
            flowTheme.colors.secondary ??
            "#64748B"
          }
        />
      );
    }
    case "avatar":
      return <Avatar {...props} />;
    case "badge": {
      const badgeProps = props as React.ComponentProps<typeof Badge>;
      return (
        <Badge
          {...withThemeFont(
            {
              ...badgeProps,
              bg: resolveColor(badgeProps.bg) ?? flowTheme.colors.secondary,
              iconColor: resolveColor(badgeProps.iconColor),
            },
            "label",
            flowTheme.colors.neutral,
          )}
        />
      );
    }
    case "quiz": {
      const quizProps = props as React.ComponentProps<typeof Quiz>;
      const valueId = readPrimitiveValueId(p);
      const selectedValue = options?.primitiveValues?.[valueId];
      const selectedIds =
        typeof selectedValue === "string" && selectedValue.length > 0
          ? selectedValue.split(",").filter(Boolean)
          : quizProps.selectedIds;
      return (
        <Quiz
          {...quizProps}
          selectedIds={selectedIds}
          bg={resolveThemedComponentBg(quizProps.bg)}
          borderColor={resolveColor(quizProps.borderColor)}
          selectionColor={
            resolveColor(quizProps.selectionColor) ?? flowTheme.colors.primary
          }
          selectionBorderColor={resolveColor(quizProps.selectionBorderColor)}
          iconColor={
            resolveColor(quizProps.iconColor) ?? flowTheme.colors.primary
          }
          color={resolveColor(quizProps.color) ?? flowTheme.colors.primary}
          subtitleColor={
            resolveColor(quizProps.subtitleColor) ?? flowTheme.colors.secondary
          }
          fontFamily={
            quizProps.fontFamily ??
            flowTheme.fonts.headline ??
            options?.layoutFontFamily
          }
          subtitleFontFamily={
            quizProps.subtitleFontFamily ??
            flowTheme.fonts.body ??
            options?.layoutFontFamily
          }
          disableInteractionState={options?.disableInteractionState}
          onSelectionChange={(selected) =>
            options?.onPrimitiveValueChange?.(valueId, selected.join(","))
          }
        />
      );
    }
    case "features":
      return (
        <Features
          {...withThemeFont(
            {
              ...(props as React.ComponentProps<typeof Features>),
              bg: resolveThemedComponentBg(
                (props as React.ComponentProps<typeof Features>).bg,
              ),
              iconBg: resolveColor(
                (props as React.ComponentProps<typeof Features>).iconBg,
              ),
              iconColor: resolveColor(
                (props as React.ComponentProps<typeof Features>).iconColor,
              ),
              titleColor: resolveColor(
                (props as React.ComponentProps<typeof Features>).titleColor,
              ),
              subtitleColor: resolveColor(
                (props as React.ComponentProps<typeof Features>).subtitleColor,
              ),
            },
            "body",
            flowTheme.colors.primary,
          )}
          disableInteractionState={options?.disableInteractionState}
        />
      );
    case "testimonial_card":
      return (
        <TestimonialCard
          {...withThemeFont(
            {
              ...(props as React.ComponentProps<typeof TestimonialCard>),
              bg: resolveThemedComponentBg(
                (props as React.ComponentProps<typeof TestimonialCard>).bg,
              ),
              textColor: resolveColor(
                (props as React.ComponentProps<typeof TestimonialCard>)
                  .textColor,
              ),
              nameColor: resolveColor(
                (props as React.ComponentProps<typeof TestimonialCard>)
                  .nameColor,
              ),
              roleColor: resolveColor(
                (props as React.ComponentProps<typeof TestimonialCard>)
                  .roleColor,
              ),
              ratingColor: resolveColor(
                (props as React.ComponentProps<typeof TestimonialCard>)
                  .ratingColor,
              ),
            },
            "body",
            flowTheme.colors.primary,
          )}
        />
      );
    case "package_selector":
    case "package_card":
    case "package_list":
    case "trial_text":
    case "feature_list":
    case "restore_purchases_button":
    case "close_button":
    case "legal_text":
    case "terms_links": {
      const paywallNode = renderPaywallPrimitive(
        p.type,
        props as Record<string, unknown>,
        options,
      );
      if (paywallNode !== undefined) {
        return paywallNode;
      }
      return null;
    }
    case "packages":
      return <Packages {...props} />;
    case "loading":
      return (
        <Loading
          {...withThemeFont(
            props as React.ComponentProps<typeof Loading>,
            "body",
            flowTheme.colors.primary,
          )}
        />
      );
    case "icon":
      return (
        <Icon
          {...(props as React.ComponentProps<typeof Icon>)}
          color={
            resolveColor((props as React.ComponentProps<typeof Icon>).color) ??
            flowTheme.colors.primary
          }
        />
      );
    default:
      return null;
  }
}

function isVisibleForCurrentStep(
  visibility: PrimitiveInstance["visibility"],
  currentStepId: string | undefined,
): boolean {
  if (!visibility || visibility.mode === "all") {
    return true;
  }
  if (!currentStepId) {
    return false;
  }
  const stepIds = visibility.stepIds ?? [];
  if (visibility.mode === "include_steps") {
    return stepIds.includes(currentStepId);
  }
  return !stepIds.includes(currentStepId);
}

function identityScale(value: number): number {
  return value;
}
