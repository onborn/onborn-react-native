import {
  resolveGradientSolidColor,
  type CTAButtonAction,
  type FlowConfig,
  type FlowTheme,
  type GetFlowResponse,
  type GetPaywallResponse,
  type CustomerEntitlement,
  type BillingProduct,
  type LayoutBg,
  normalizePackageSelectorProps,
  applyPaywallTranslations,
  isPaywallStepId,
  mergePaywallFlowTheme,
  type PaywallConfig,
  type PaywallStep,
  type Slot,
  type Step,
  type StepType,
  type TextFontFamily,
} from "@onborn/sdk-contracts";
import type { FallbackTemplateName } from "../config/templates";
import type { FlowCacheStorage } from "../config/cache";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Platform,
  View,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import Animated from "react-native-reanimated";
import * as StoreReview from "expo-store-review";

import {
  createStepTransitionAnimations,
  STEP_TRANSITION_MS,
} from "./step-transitions";
import {
  createInternalClient,
  type ConversionFlowClient,
  type ConversionFlowClientOptions,
  type RuntimeExperimentContext,
} from "../core/client";
import { resolveLayoutPresetConfig } from "../config/layout";
import { resolveRuntimeLocale } from "../config/locale";
import { useSubscriptionFlow } from "../hooks/useSubscriptionFlow";
import {
  useSubscriptionFlowInner,
  type RuntimeFlowConfig,
  type RuntimeStep,
} from "../hooks/useSubscriptionFlowInner";
import {
  FunnelScreenRenderer,
  type FunnelScreenRendererProps,
  type PrimitiveInstance,
  type PrimitiveRenderOptions,
  type PrimitiveValue,
  primitivesMapToInstances,
  renderPrimitive,
} from "../ui/primitive-pipeline";
import { ScreenLayout } from "../ui/Layout/ScreenLayout";
import { CarouselRuntimeProvider } from "../ui/primitives";
import { subscriptionTamaguiConfig } from "../ui/tamagui/tamagui-config";
import { Theme, TamaguiProvider } from "tamagui";
import { useOnbornFonts } from "../ui/typography";
import { resolveFlowTheme, resolveThemeToken } from "../ui/theme/flowTheme";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ResponsiveProvider } from "../ui/responsive";
import {
  findPackageWithProduct,
  getPackagesWithProducts,
  resolveDefaultPackageId,
  type OnbornBillingAdapter,
  type OnbornPackageWithProduct,
  type OnbornPaywallRuntimeContext,
  type OnbornPurchaseResult,
  type OnbornRestoreResult,
  validateBillingPurchase,
  validateBillingRestore,
} from "../paywall";
import { useOnbornRuntimeConfig } from "../config/Onborn";

export type SubscriptionFlowStepComponentProps = {
  step: RuntimeStep;
  stepIndex: number;
  totalSteps: number;
  stepIds: string[];
  flowPrimitives: PrimitiveInstance[];
  progressValue: number;
  progressStepIndex: number;
  progressStepCount: number;
  progressSegments: string[][];
  flowTheme?: FlowTheme;
  layoutFontFamily?: TextFontFamily;
  stepAnimation?: FunnelScreenRendererProps["stepAnimation"];
  onPrimitivePress?: (primitiveId: string) => void;
  disableInteractionState?: boolean;
  disableInputEditing?: boolean;
  preserveEmptyVariableTokens?: boolean;
  flowValues: Record<string, PrimitiveValue>;
  onPrimitiveValueChange: (
    step: RuntimeStep,
    primitiveId: string,
    value: PrimitiveValue,
  ) => void;
  onBack: () => void;
  onSkip: () => void;
  onNext: (extra?: {
    answer?: unknown;
    converted?: boolean;
    skipped?: boolean;
    targetStepId?: string;
  }) => void;
  onToggleChange?: (event: {
    step: RuntimeStep;
    stepIndex: number;
    primitiveId: string;
    toggleId?: string;
    value: boolean;
  }) => void;
  paywallContext?: OnbornPaywallRuntimeContext;
  onPaywallPurchase?: (intent?: "purchase" | "trial") => void;
  onPaywallRestore?: () => void;
  customStepRenderers?: NativeCustomStepRenderers;
  onCustomStepMissing?: (event: {
    rendererKey: string;
    step: Extract<Step, { type: "native_custom" }>;
  }) => void;
};

export type NativeCustomStepPrimitiveInput = {
  id?: string;
  type: string;
  slot?: Slot;
  order?: number;
  visible?: boolean;
  props?: Record<string, unknown>;
};

export type NativeCustomStepRenderActions = {
  next: (extra?: { answer?: unknown; targetStepId?: string }) => void;
  back: () => void;
  skip: () => void;
  setValue: (primitiveId: string, value: PrimitiveValue) => void;
};

export type NativeCustomStepPrimitiveHelpers = {
  renderPrimitive: (
    primitive: NativeCustomStepPrimitiveInput,
  ) => React.ReactNode;
  renderTitle: (props: Record<string, unknown>) => React.ReactNode;
  renderSubtitle: (props: Record<string, unknown>) => React.ReactNode;
  renderCTAButton: (props: Record<string, unknown>) => React.ReactNode;
  renderBackButton: (props?: Record<string, unknown>) => React.ReactNode;
  renderSkipButton: (props?: Record<string, unknown>) => React.ReactNode;
};

export type NativeCustomStepRendererProps = {
  step: Extract<Step, { type: "native_custom" }>;
  theme?: FlowTheme;
  layout: {
    preset: RuntimeStep["layout"]["preset"];
    bg?: LayoutBg;
    fontFamily?: TextFontFamily;
    safeArea: boolean;
  };
  values: Record<string, PrimitiveValue>;
  actions: NativeCustomStepRenderActions;
  primitives: NativeCustomStepPrimitiveHelpers;
};

export type NativeCustomStepRenderer = (
  props: NativeCustomStepRendererProps,
) => React.ReactNode;

export type NativeCustomStepRenderers = Record<
  string,
  NativeCustomStepRenderer
>;

export type InitialLoadingComponentProps = {
  kind: "flow" | "paywall";
  flowId?: string;
  paywallId?: string;
};

export type SubscriptionFlowInternalProps = {
  flow: FlowConfig | RuntimeFlowConfig;
  client: ConversionFlowClient;
  sessionId: string;
  userId?: string;
  experimentContext?: RuntimeExperimentContext | null;
  variantId?: string;
  initialStepId?: string;
  disableStepNavigation?: boolean;
  onNextStep?: (event: {
    step: RuntimeStep;
    stepIndex: number;
    answer?: unknown;
    nextStep?: RuntimeStep;
    nextStepIndex: number;
    completed: boolean;
  }) => void;
  onBack?: (event: {
    step: RuntimeStep;
    stepIndex: number;
    previousStep?: RuntimeStep;
    previousStepIndex: number;
  }) => void;
  onSkip?: (event: { step: RuntimeStep; stepIndex: number }) => void;
  onFlowCompleted?: () => void;
  onLoadingEnd?: (stepId: string) => void;
  onToggleChange?: (event: {
    step: RuntimeStep;
    stepIndex: number;
    primitiveId: string;
    toggleId?: string;
    value: boolean;
  }) => void;
  stepTransitionMs?: number;
  responsiveViewport?: { width: number; height: number };
  onPrimitivePress?: (primitiveId: string) => void;
  disableInteractionState?: boolean;
  disableInputEditing?: boolean;
  preserveEmptyVariableTokens?: boolean;
  paywalls?: GetFlowResponse["paywalls"];
  paywallContext?: OnbornPaywallRuntimeContext;
  platform?: ConversionFlowClientOptions["platform"];
  billingAdapter?: OnbornBillingAdapter;
  onStartTrial?: (
    item: OnbornPackageWithProduct,
  ) => void | false | Promise<void | false>;
  onPurchaseStarted?: (item: OnbornPackageWithProduct) => void;
  onPurchaseCompleted?: (result: OnbornPurchaseResult) => void;
  onPurchaseFailed?: (error: Error) => void;
  onRestoreCompleted?: (result: OnbornRestoreResult) => void;
  onRestoreFailed?: (error: Error) => void;
  onEntitlementsChanged?: (entitlements: CustomerEntitlement[]) => void;
  onPaywallShown?: (event: {
    paywallId: string;
    paywallName: string;
    stepId: string;
  }) => void;
  customStepRenderers?: NativeCustomStepRenderers;
  onCustomStepMissing?: SubscriptionFlowStepComponentProps["onCustomStepMissing"];
};

export type SubscriptionFlowProps = {
  flowId: string;
  fallbackTemplate?: FallbackTemplateName;
  initialStepId?: string;
  onNextStep?: SubscriptionFlowInternalProps["onNextStep"];
  onBack?: SubscriptionFlowInternalProps["onBack"];
  onSkip?: SubscriptionFlowInternalProps["onSkip"];
  onFlowCompleted?: SubscriptionFlowInternalProps["onFlowCompleted"];
  onLoadingEnd?: SubscriptionFlowInternalProps["onLoadingEnd"];
  onToggleChange?: SubscriptionFlowInternalProps["onToggleChange"];
  billingAdapter?: OnbornBillingAdapter;
  onStartTrial?: SubscriptionFlowInternalProps["onStartTrial"];
  onPurchaseStarted?: SubscriptionFlowInternalProps["onPurchaseStarted"];
  onPurchaseCompleted?: SubscriptionFlowInternalProps["onPurchaseCompleted"];
  onPurchaseFailed?: SubscriptionFlowInternalProps["onPurchaseFailed"];
  onRestoreCompleted?: SubscriptionFlowInternalProps["onRestoreCompleted"];
  onRestoreFailed?: SubscriptionFlowInternalProps["onRestoreFailed"];
  onEntitlementsChanged?: SubscriptionFlowInternalProps["onEntitlementsChanged"];
  onPaywallShown?: SubscriptionFlowInternalProps["onPaywallShown"];
  customStepRenderers?: NativeCustomStepRenderers;
  onCustomStepMissing?: SubscriptionFlowInternalProps["onCustomStepMissing"];
  cacheStorage?: FlowCacheStorage;
  InitialLoadingComponent?: React.ComponentType<InitialLoadingComponentProps>;
};

export type SubscriptionPaywallProps = {
  paywallId: string;
  billingAdapter?: OnbornBillingAdapter;
  onStartTrial?: SubscriptionFlowInternalProps["onStartTrial"];
  onPurchaseStarted?: SubscriptionFlowInternalProps["onPurchaseStarted"];
  onPurchaseCompleted?: SubscriptionFlowInternalProps["onPurchaseCompleted"];
  onPurchaseFailed?: SubscriptionFlowInternalProps["onPurchaseFailed"];
  onRestoreCompleted?: SubscriptionFlowInternalProps["onRestoreCompleted"];
  onRestoreFailed?: SubscriptionFlowInternalProps["onRestoreFailed"];
  onEntitlementsChanged?: SubscriptionFlowInternalProps["onEntitlementsChanged"];
  onPaywallShown?: SubscriptionFlowInternalProps["onPaywallShown"];
  onFlowCompleted?: SubscriptionFlowInternalProps["onFlowCompleted"];
  InitialLoadingComponent?: React.ComponentType<InitialLoadingComponentProps>;
};

function FunnelStepView(props: SubscriptionFlowStepComponentProps) {
  const stepInstances = useMemo(() => {
    const instances = primitivesMapToInstances(props.step.primitives);
    return props.step.type === "loading" ||
      props.step.type === "custom" ||
      props.step.type === "metrics" ||
      props.step.type === "paywall"
      ? instances
      : stripProgressBarInstances(instances);
  }, [props.step.primitives, props.step.type]);
  const inputValues = useMemo(
    () => resolveStepValues(props.step, stepInstances, props.flowValues),
    [props.flowValues, props.step, stepInstances],
  );
  const validationState = useMemo(
    () => resolveStepValidationState(stepInstances, inputValues),
    [inputValues, stepInstances],
  );
  const layout = resolveLayoutPresetConfig(props.step.layout.preset);

  const handleNext = () => {
    if (!validationState.canProceed) {
      return;
    }
    const answer =
      Object.keys(inputValues).length > 0 ? { ...inputValues } : undefined;
    props.onNext({
      answer,
      targetStepId: resolveQuizAnswerTargetStepId(
        props.step,
        stepInstances,
        inputValues,
        props.stepIds,
      ),
    });
  };
  const handleAction = (action: CTAButtonAction = "next") => {
    if (action === "back") {
      props.onBack();
      return;
    }
    if (action === "skip") {
      props.onSkip();
      return;
    }
    if (
      props.paywallContext?.paywall &&
      (action === "purchase" || action === "start_trial" || action === "next")
    ) {
      props.onPaywallPurchase?.(
        action === "start_trial" ? "trial" : "purchase",
      );
      return;
    }
    handleNext();
  };

  return (
    <FunnelScreenRenderer
      primitives={stepInstances}
      persistentPrimitives={props.flowPrimitives}
      stepAnimation={props.stepAnimation}
      options={{
        onBackPress: props.onBack,
        onSkipPress: props.onSkip,
        onCtaPress: handleAction,
        isCtaActionDisabled: (action) =>
          action === "next" && !validationState.canProceed,
        onPrimitivePress: props.onPrimitivePress,
        disableInteractionState: props.disableInteractionState,
        disableInputEditing: props.disableInputEditing,
        inputValues,
        primitiveValues: inputValues,
        variableValues: props.flowValues,
        preserveEmptyVariableTokens: props.preserveEmptyVariableTokens,
        onInputChange: (inputId, text) =>
          props.onPrimitiveValueChange(props.step, inputId, text),
        onPrimitiveValueChange: (primitiveId, value) =>
          props.onPrimitiveValueChange(props.step, primitiveId, value),
        onToggleChange: (event) =>
          props.onToggleChange?.({
            step: props.step,
            stepIndex: props.stepIndex,
            ...event,
          }),
        layout,
        layoutBg: resolveThemedLayoutBg(props.step.layout.bg, props.flowTheme),
        flowTheme: props.flowTheme,
        layoutFontFamily:
          props.layoutFontFamily ?? props.step.layout.fontFamily,
        layoutSafeArea: props.step.layout.safeArea !== false,
        layoutKeyboardAware: stepHasInput(props.step),
        currentStepId: props.step.id,
        progressValue: props.progressValue,
        progressStepIndex: props.progressStepIndex,
        progressStepCount: props.progressStepCount,
        paywallContext: props.paywallContext,
        persistProgressAnimation: !props.disableInteractionState,
        getProgressValue: (primitive) =>
          resolveProgressValueForPrimitive(
            primitive,
            props.step.id,
            props.progressStepIndex,
            props.progressStepCount,
          ),
        getProgressScope: (primitive) =>
          resolveProgressScopeForPrimitive(
            primitive,
            props.step.id,
            props.progressStepIndex,
            props.progressStepCount,
          ),
      }}
    />
  );
}

const QuizStepView = FunnelStepView;

function NativeCustomStepView(props: SubscriptionFlowStepComponentProps) {
  if (props.step.type !== "native_custom") {
    return <FunnelStepView {...props} />;
  }

  const step = props.step;
  const rendererKey = step.native.rendererKey;
  const renderer = props.customStepRenderers?.[rendererKey];
  const stepInstances = useMemo(
    () => primitivesMapToInstances(step.primitives),
    [step.primitives],
  );
  const inputValues = useMemo(
    () => resolveStepValues(step, stepInstances, props.flowValues),
    [props.flowValues, step, stepInstances],
  );
  const layout = resolveLayoutPresetConfig(step.layout.preset);
  const layoutBg = resolveThemedLayoutBg(step.layout.bg, props.flowTheme);
  const layoutFontFamily =
    props.layoutFontFamily ?? step.layout.fontFamily ?? undefined;

  const handleAction = useCallback(
    (action: CTAButtonAction = "next") => {
      if (action === "back") {
        props.onBack();
        return;
      }
      if (action === "skip") {
        props.onSkip();
        return;
      }
      if (
        props.paywallContext?.paywall &&
        (action === "purchase" || action === "start_trial" || action === "next")
      ) {
        props.onPaywallPurchase?.(
          action === "start_trial" ? "trial" : "purchase",
        );
        return;
      }
      props.onNext({
        answer:
          Object.keys(inputValues).length > 0 ? { ...inputValues } : undefined,
      });
    },
    [
      inputValues,
      props.onBack,
      props.onNext,
      props.onPaywallPurchase,
      props.onSkip,
      props.paywallContext?.paywall,
    ],
  );

  const primitiveOptions = useMemo<PrimitiveRenderOptions>(
    () => ({
      onBackPress: props.onBack,
      onSkipPress: props.onSkip,
      onCtaPress: handleAction,
      onPrimitivePress: props.onPrimitivePress,
      disableInteractionState: props.disableInteractionState,
      disableInputEditing: props.disableInputEditing,
      inputValues,
      primitiveValues: inputValues,
      variableValues: props.flowValues,
      preserveEmptyVariableTokens: props.preserveEmptyVariableTokens,
      onInputChange: (inputId, text) =>
        props.onPrimitiveValueChange(step, inputId, text),
      onPrimitiveValueChange: (primitiveId, value) =>
        props.onPrimitiveValueChange(step, primitiveId, value),
      onToggleChange: (event) =>
        props.onToggleChange?.({
          step,
          stepIndex: props.stepIndex,
          ...event,
        }),
      layout,
      layoutBg,
      flowTheme: props.flowTheme,
      layoutFontFamily,
      layoutSafeArea: step.layout.safeArea !== false,
      layoutKeyboardAware: stepHasInput(step),
      currentStepId: step.id,
      progressValue: props.progressValue,
      progressStepIndex: props.progressStepIndex,
      progressStepCount: props.progressStepCount,
      paywallContext: props.paywallContext,
      persistProgressAnimation: !props.disableInteractionState,
      getProgressValue: (primitive) =>
        resolveProgressValueForPrimitive(
          primitive,
          step.id,
          props.progressStepIndex,
          props.progressStepCount,
        ),
      getProgressScope: (primitive) =>
        resolveProgressScopeForPrimitive(
          primitive,
          step.id,
          props.progressStepIndex,
          props.progressStepCount,
        ),
    }),
    [
      handleAction,
      inputValues,
      layout,
      layoutBg,
      layoutFontFamily,
      props.disableInputEditing,
      props.disableInteractionState,
      props.flowTheme,
      props.flowValues,
      props.onBack,
      props.onPrimitivePress,
      props.onPrimitiveValueChange,
      props.onSkip,
      props.onToggleChange,
      props.paywallContext,
      props.preserveEmptyVariableTokens,
      props.progressStepCount,
      props.progressStepIndex,
      props.progressSegments,
      props.progressValue,
      props.stepIds,
      props.stepIndex,
      step,
    ],
  );

  const renderOnbornPrimitive = useCallback(
    (primitive: NativeCustomStepPrimitiveInput) =>
      renderPrimitive(
        normalizeNativeCustomPrimitive(primitive),
        primitiveOptions,
      ),
    [primitiveOptions],
  );
  const primitiveHelpers = useMemo<NativeCustomStepPrimitiveHelpers>(
    () => ({
      renderPrimitive: renderOnbornPrimitive,
      renderTitle: (primitiveProps) =>
        renderOnbornPrimitive({ type: "title", props: primitiveProps }),
      renderSubtitle: (primitiveProps) =>
        renderOnbornPrimitive({ type: "subtitle", props: primitiveProps }),
      renderCTAButton: (primitiveProps) =>
        renderOnbornPrimitive({ type: "cta_button", props: primitiveProps }),
      renderBackButton: (primitiveProps = {}) =>
        renderOnbornPrimitive({ type: "back_button", props: primitiveProps }),
      renderSkipButton: (primitiveProps = {}) =>
        renderOnbornPrimitive({ type: "skip_button", props: primitiveProps }),
    }),
    [renderOnbornPrimitive],
  );

  useEffect(() => {
    if (renderer) {
      return;
    }
    props.onCustomStepMissing?.({ rendererKey, step });
  }, [props.onCustomStepMissing, renderer, rendererKey, step]);

  if (!renderer) {
    return (
      <FunnelScreenRenderer
        primitives={nativeCustomMissingRendererPrimitives(rendererKey)}
        persistentPrimitives={props.flowPrimitives}
        stepAnimation={props.stepAnimation}
        options={primitiveOptions}
      />
    );
  }

  const rendered = renderer({
    step,
    theme: props.flowTheme,
    layout: {
      preset: step.layout.preset,
      bg: layoutBg,
      fontFamily: layoutFontFamily,
      safeArea: step.layout.safeArea !== false,
    },
    values: props.flowValues,
    actions: {
      next: (extra) =>
        props.onNext({
          answer:
            extra?.answer ??
            (Object.keys(inputValues).length > 0
              ? { ...inputValues }
              : undefined),
          targetStepId: extra?.targetStepId,
        }),
      back: props.onBack,
      skip: props.onSkip,
      setValue: (primitiveId, value) =>
        props.onPrimitiveValueChange(step, primitiveId, value),
    },
    primitives: primitiveHelpers,
  });
  const persistentPrimitiveOptions: PrimitiveRenderOptions = {
    ...primitiveOptions,
    selectableIdPrefix: props.onPrimitivePress ? "flow:" : undefined,
  };
  const renderPersistentSlot = (slot: Slot) =>
    props.flowPrimitives
      .filter((primitive) => primitive.slot === slot)
      .map((primitive) =>
        renderPrimitive(primitive, persistentPrimitiveOptions),
      );

  return (
    <CarouselRuntimeProvider>
      <ScreenLayout
        persistentTop={renderPersistentSlot("top")}
        top={[]}
        hero={[]}
        content={[
          ...renderPersistentSlot("content"),
          <NativeCustomStepContent
            key={step.id}
            stepKey={step.id}
            stepAnimation={props.stepAnimation}
          >
            {rendered}
          </NativeCustomStepContent>,
        ]}
        bottom={renderPersistentSlot("bottom")}
        layout={layout}
        bg={layoutBg}
        safeArea={step.layout.safeArea !== false}
        keyboardAware={stepHasInput(step)}
      />
    </CarouselRuntimeProvider>
  );
}

function NativeCustomStepContent({
  stepKey,
  stepAnimation,
  children,
}: {
  stepKey: string;
  stepAnimation?: FunnelScreenRendererProps["stepAnimation"];
  children: React.ReactNode;
}) {
  const [webVisible, setWebVisible] = useState(
    Platform.OS !== "web" || !stepAnimation,
  );

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }
    if (!stepAnimation) {
      setWebVisible(true);
      return;
    }
    setWebVisible(false);
    const frame = requestAnimationFrame(() => setWebVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [stepAnimation, stepKey]);

  if (!stepAnimation) {
    return <View style={styles.nativeCustomContent}>{children}</View>;
  }

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.nativeCustomContent,
          {
            opacity: webVisible ? 1 : 0,
            transitionDuration: `${stepAnimation.durationMs ?? STEP_TRANSITION_MS}ms`,
            transitionProperty: "opacity",
            transitionTimingFunction: "ease-out",
          } as ViewStyle,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <Animated.View
      key={stepKey}
      entering={stepAnimation.entering}
      exiting={stepAnimation.exiting}
      layout={stepAnimation.layout}
      style={styles.nativeCustomContent}
    >
      {children}
    </Animated.View>
  );
}

function normalizeNativeCustomPrimitive(
  primitive: NativeCustomStepPrimitiveInput,
): PrimitiveInstance {
  return {
    id: primitive.id ?? primitive.type,
    type: primitive.type,
    slot: primitive.slot ?? "content",
    order: primitive.order ?? 0,
    visible: primitive.visible,
    props: primitive.props ?? {},
  };
}

function nativeCustomMissingRendererPrimitives(
  rendererKey: string,
): PrimitiveInstance[] {
  return [
    {
      id: "native_custom_missing_title",
      type: "title",
      slot: "content",
      order: 1,
      props: {
        text: "Native screen unavailable",
        size: "lg",
        align: "center",
      },
    },
    {
      id: "native_custom_missing_subtitle",
      type: "subtitle",
      slot: "content",
      order: 2,
      props: {
        text: `Register "${rendererKey}" in customStepRenderers to render this native custom step.`,
        align: "center",
      },
    },
    {
      id: "native_custom_missing_continue",
      type: "cta_button",
      slot: "bottom",
      order: 3,
      props: {
        text: "Continue",
        action: "next",
      },
    },
  ];
}

function resolveQuizAnswerTargetStepId(
  step: RuntimeStep,
  instances: PrimitiveInstance[],
  values: Record<string, PrimitiveValue>,
  stepIds: string[],
): string | undefined {
  if (step.type !== "quiz") {
    return undefined;
  }

  for (const instance of instances) {
    const targetStepId = resolveQuizInstanceTargetStepId(instance, values);
    if (targetStepId && stepIds.includes(targetStepId)) {
      return targetStepId;
    }
  }

  return undefined;
}

function resolveQuizInstanceTargetStepId(
  instance: PrimitiveInstance,
  values: Record<string, PrimitiveValue>,
): string | undefined {
  if (instance.type === "quiz") {
    const mode = instance.props.mode;
    if (mode !== "single") {
      return undefined;
    }
    const selectedValue = values[readPrimitiveValueId(instance)];
    const selectedId =
      typeof selectedValue === "string" ? selectedValue.split(",")[0] : "";
    if (!selectedId || !Array.isArray(instance.props.options)) {
      return undefined;
    }
    const option = instance.props.options.find(
      (candidate): candidate is { id: string; nextStepId?: string } =>
        Boolean(candidate) &&
        typeof candidate === "object" &&
        !Array.isArray(candidate) &&
        (candidate as { id?: unknown }).id === selectedId,
    );
    return typeof option?.nextStepId === "string"
      ? option.nextStepId
      : undefined;
  }

  if (!Array.isArray(instance.props.children)) {
    return undefined;
  }

  for (const [index, child] of instance.props.children.entries()) {
    if (!child || typeof child !== "object" || Array.isArray(child)) {
      continue;
    }
    const record = child as {
      type?: unknown;
      props?: Record<string, unknown>;
    };
    if (typeof record.type !== "string" || !record.props) {
      continue;
    }
    const targetStepId = resolveQuizInstanceTargetStepId(
      {
        id: `${instance.id ?? instance.type}::${index}`,
        type: record.type,
        slot: "content",
        order: index,
        props: record.props,
      },
      values,
    );
    if (targetStepId) {
      return targetStepId;
    }
  }

  return undefined;
}

function extractAnswerValues(
  instances: ReturnType<typeof primitivesMapToInstances>,
): Record<string, PrimitiveValue> {
  const values: Record<string, PrimitiveValue> = {};
  for (const instance of instances) {
    if (instance.type === "input") {
      values[readPrimitiveValueId(instance)] =
        typeof instance.props.value === "string" ? instance.props.value : "";
    }
    if (
      (instance.type === "age_picker" ||
        instance.type === "height_picker" ||
        instance.type === "weight_picker") &&
      typeof instance.props.value === "number"
    ) {
      values[readPrimitiveValueId(instance)] = instance.props.value;
      if (
        instance.type === "height_picker" &&
        (instance.props.unit === "cm" || instance.props.unit === "ft")
      ) {
        values[`${readPrimitiveValueId(instance)}__unit`] = instance.props.unit;
      }
      if (
        instance.type === "weight_picker" &&
        (instance.props.unit === "kg" || instance.props.unit === "lb")
      ) {
        values[`${readPrimitiveValueId(instance)}__unit`] = instance.props.unit;
      }
    }
    if (
      instance.type === "toggle" &&
      typeof instance.props.value === "boolean"
    ) {
      values[readPrimitiveValueId(instance)] = instance.props.value;
    }
    if (instance.type === "quiz" && Array.isArray(instance.props.selectedIds)) {
      values[readPrimitiveValueId(instance)] = instance.props.selectedIds
        .filter((id): id is string => typeof id === "string")
        .join(",");
    }
    collectEmbeddedAnswerValues(instance.props.children, instance.id, values);
  }
  return values;
}

function collectEmbeddedAnswerValues(
  children: unknown,
  parentId: string | undefined,
  values: Record<string, PrimitiveValue>,
) {
  if (!Array.isArray(children)) {
    return;
  }

  children.forEach((child, index) => {
    if (!child || typeof child !== "object" || Array.isArray(child)) {
      return;
    }
    const record = child as {
      type?: unknown;
      props?: Record<string, unknown>;
    };
    if (typeof record.type !== "string" || !record.props) {
      return;
    }
    const instance: PrimitiveInstance = {
      id: parentId ? `${parentId}::${index}` : `${record.type}-${index}`,
      type: record.type,
      slot: "content",
      order: index,
      props: record.props,
    };
    Object.assign(values, extractAnswerValues([instance]));
  });
}

function extractFlowValues(
  flow: FlowConfig | RuntimeFlowConfig,
): Record<string, PrimitiveValue> {
  return flow.steps.reduce<Record<string, PrimitiveValue>>((acc, step) => {
    const stepValues = extractAnswerValues(
      stripProgressBarInstances(primitivesMapToInstances(step.primitives)),
    );
    for (const [key, value] of Object.entries(stepValues)) {
      if (acc[key] === undefined) {
        acc[key] = value;
      }
      acc[`${step.id}.${key}`] = value;
    }
    return acc;
  }, {});
}

function resolveStepValues(
  step: RuntimeStep,
  instances: PrimitiveInstance[],
  flowValues: Record<string, PrimitiveValue>,
): Record<string, PrimitiveValue> {
  const defaults = extractAnswerValues(instances);
  const resolved: Record<string, PrimitiveValue> = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    resolved[key] =
      flowValues[`${step.id}.${key}`] ?? flowValues[key] ?? fallback;
  }
  return resolved;
}

function readPrimitiveValueId(instance: {
  id?: string;
  type: string;
  props: Record<string, unknown>;
}): string {
  const configuredId = instance.props.id;
  if (typeof configuredId === "string" && configuredId.trim().length > 0) {
    return configuredId.trim();
  }
  return instance.id ?? instance.type;
}

function resolveStepValidationState(
  instances: PrimitiveInstance[],
  values: Record<string, PrimitiveValue>,
): { canProceed: boolean } {
  for (const instance of instances) {
    if (!isPrimitiveRequiredQuizAnswered(instance, values)) {
      return { canProceed: false };
    }
  }
  return { canProceed: true };
}

function isPrimitiveRequiredQuizAnswered(
  instance: PrimitiveInstance,
  values: Record<string, PrimitiveValue>,
): boolean {
  if (instance.type === "quiz" && instance.props.required === true) {
    const selectedValue = values[readPrimitiveValueId(instance)];
    if (typeof selectedValue === "string") {
      return selectedValue
        .split(",")
        .some((selectedId) => selectedId.trim().length > 0);
    }
    return false;
  }

  if (!Array.isArray(instance.props.children)) {
    return true;
  }

  for (const [index, child] of instance.props.children.entries()) {
    if (!child || typeof child !== "object" || Array.isArray(child)) {
      continue;
    }
    const record = child as {
      type?: unknown;
      props?: Record<string, unknown>;
    };
    if (typeof record.type !== "string" || !record.props) {
      continue;
    }
    const childInstance: PrimitiveInstance = {
      id: `${instance.id ?? instance.type}::${index}`,
      type: record.type,
      slot: "content",
      order: index,
      props: record.props,
    };
    if (!isPrimitiveRequiredQuizAnswered(childInstance, values)) {
      return false;
    }
  }

  return true;
}

function primitiveTreeHasInput(primitive: {
  type?: unknown;
  props?: unknown;
}): boolean {
  if (primitive.type === "input") {
    return true;
  }
  const props = primitive.props;
  if (!props || typeof props !== "object" || Array.isArray(props)) {
    return false;
  }
  const children = (props as { children?: unknown }).children;
  if (!Array.isArray(children)) {
    return false;
  }
  return children.some((child) =>
    child && typeof child === "object" && !Array.isArray(child)
      ? primitiveTreeHasInput(child as { type?: unknown; props?: unknown })
      : false,
  );
}

function stepHasInput(step: RuntimeStep | null | undefined): boolean {
  if (!step) {
    return false;
  }
  return Object.values(step.primitives).some((primitive) =>
    primitiveTreeHasInput(primitive as { type?: unknown; props?: unknown }),
  );
}

function stripProgressBarInstances(
  instances: PrimitiveInstance[],
): PrimitiveInstance[] {
  return instances.flatMap((instance) => {
    if (instance.type === "progress_bar") {
      return [];
    }
    return [{ ...instance, props: stripProgressBarChildren(instance.props) }];
  });
}

function stripProgressBarChildren(
  props: Record<string, unknown>,
): Record<string, unknown> {
  if (!Array.isArray(props.children)) {
    return props;
  }

  return {
    ...props,
    children: props.children.flatMap((child) => {
      if (!child || typeof child !== "object" || Array.isArray(child)) {
        return [];
      }
      const record = child as { type?: unknown; props?: unknown };
      if (record.type === "progress_bar") {
        return [];
      }
      if (
        !record.props ||
        typeof record.props !== "object" ||
        Array.isArray(record.props)
      ) {
        return [child];
      }
      return [
        {
          ...record,
          props: stripProgressBarChildren(
            record.props as Record<string, unknown>,
          ),
        },
      ];
    }),
  };
}

const DEFAULT_STEP_COMPONENTS: Record<
  StepType | "paywall",
  React.ComponentType<SubscriptionFlowStepComponentProps>
> = {
  benefits: FunnelStepView,
  custom: FunnelStepView,
  loading: FunnelStepView,
  metrics: FunnelStepView,
  native_custom: NativeCustomStepView,
  permissions: FunnelStepView,
  quiz: QuizStepView,
  quiz_answer: FunnelStepView,
  paywall: FunnelStepView,
  social_proof: FunnelStepView,
  welcome: FunnelStepView,
};

function collectPrimitiveFontFamilies(
  primitive: { props?: unknown } | null | undefined,
  fontFamilies: Set<string>,
) {
  const props =
    primitive?.props &&
    typeof primitive.props === "object" &&
    !Array.isArray(primitive.props)
      ? (primitive.props as Record<string, unknown>)
      : undefined;
  if (!props) {
    return;
  }

  for (const [key, value] of Object.entries(props)) {
    if (key.toLowerCase().endsWith("fontfamily") && typeof value === "string") {
      fontFamilies.add(value);
    }
  }

  if (!Array.isArray(props?.children)) {
    return;
  }

  for (const child of props.children) {
    if (child && typeof child === "object") {
      collectPrimitiveFontFamilies(child as { props?: unknown }, fontFamilies);
    }
  }
}

function extractFontFamilies(flow: FlowConfig | RuntimeFlowConfig): string[] {
  const fontFamilies = new Set<string>();
  if (flow.theme?.fonts) {
    for (const value of Object.values(flow.theme.fonts)) {
      if (typeof value === "string") {
        fontFamilies.add(value);
      }
    }
  }
  if (flow.theme?.buttons) {
    for (const button of Object.values(flow.theme.buttons)) {
      if (typeof button?.fontFamily === "string") {
        fontFamilies.add(button.fontFamily);
      }
    }
  }

  for (const step of flow.steps) {
    if (typeof step.layout.fontFamily === "string") {
      fontFamilies.add(step.layout.fontFamily);
    }

    for (const primitive of Object.values(step.primitives)) {
      collectPrimitiveFontFamilies(primitive, fontFamilies);
    }
  }
  for (const primitive of Object.values(flow.primitives ?? {})) {
    collectPrimitiveFontFamilies(primitive, fontFamilies);
  }

  return Array.from(fontFamilies);
}

function useAnalyticsAppStateFlush(client: ConversionFlowClient): void {
  const previousStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = previousStateRef.current;
      previousStateRef.current = nextState;

      if (previousState === "active" || nextState === "active") {
        void client.flushEvents();
      }
    });

    return () => {
      subscription.remove();
      void client.flushEvents();
    };
  }, [client]);
}

export function SubscriptionFlow(props: SubscriptionFlowProps) {
  const runtimeOptions = useOnbornRuntimeConfig(props);
  const sessionId = useMemo(
    () => `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    [runtimeOptions.flowId],
  );
  const runtimeUserId = useMemo(
    () => runtimeOptions.userId ?? createRuntimeAnonymousUserId("flow"),
    [runtimeOptions.userId],
  );
  const locale = useMemo(
    () => resolveRuntimeLocale(runtimeOptions.locale),
    [runtimeOptions.locale],
  );
  const platform =
    runtimeOptions.platform ?? (Platform.OS === "android" ? "android" : "ios");
  const client = useMemo(
    () =>
      createInternalClient({
        apiKey: runtimeOptions.apiKey,
        flowId: runtimeOptions.flowId,
        userId: runtimeUserId,
        locale,
        appId: runtimeOptions.appId,
        platform,
        country: runtimeOptions.country,
        appVersion: runtimeOptions.appVersion,
        userType: runtimeOptions.userType,
        sdkVersion: runtimeOptions.sdkVersion,
        fetchImpl: runtimeOptions.fetchImpl,
      }),
    [
      runtimeOptions.apiKey,
      runtimeOptions.appId,
      runtimeOptions.appVersion,
      runtimeOptions.country,
      runtimeOptions.fetchImpl,
      runtimeOptions.flowId,
      locale,
      platform,
      runtimeUserId,
      runtimeOptions.sdkVersion,
      runtimeOptions.userType,
    ],
  );
  useAnalyticsAppStateFlush(client);
  const { flow, paywalls, experiment, loading } = useSubscriptionFlow({
    flowId: runtimeOptions.flowId,
    fallbackTemplate: runtimeOptions.fallbackTemplate,
    cacheStorage: runtimeOptions.cacheStorage,
  });
  const localizedPaywalls = useMemo(
    () =>
      paywalls.map((entry) => ({
        ...entry,
        paywall: applyPaywallTranslations(entry.paywall, locale),
      })),
    [locale, paywalls],
  );

  if (!flow) {
    return (
      <InitialLoadingFallback
        InitialLoadingComponent={props.InitialLoadingComponent}
        flowId={runtimeOptions.flowId}
        kind="flow"
        loading={loading}
      />
    );
  }

  return (
    <SubscriptionFlowInternal
      flow={flow}
      client={client}
      sessionId={sessionId}
      userId={runtimeUserId}
      experimentContext={experiment}
      variantId={experiment?.variantId}
      initialStepId={props.initialStepId}
      onNextStep={props.onNextStep}
      onBack={props.onBack}
      onSkip={props.onSkip}
      onFlowCompleted={props.onFlowCompleted}
      onLoadingEnd={props.onLoadingEnd}
      onToggleChange={props.onToggleChange}
      paywalls={localizedPaywalls}
      platform={platform}
      billingAdapter={props.billingAdapter}
      onStartTrial={props.onStartTrial}
      onPurchaseStarted={props.onPurchaseStarted}
      onPurchaseCompleted={props.onPurchaseCompleted}
      onPurchaseFailed={props.onPurchaseFailed}
      onRestoreCompleted={props.onRestoreCompleted}
      onRestoreFailed={props.onRestoreFailed}
      onEntitlementsChanged={props.onEntitlementsChanged}
      onPaywallShown={props.onPaywallShown}
      customStepRenderers={props.customStepRenderers}
      onCustomStepMissing={props.onCustomStepMissing}
    />
  );
}

function paywallToFlowConfig(paywall: PaywallConfig): RuntimeFlowConfig {
  return {
    id: `paywall:${paywall.id}`,
    version: paywall.version,
    template: "custom",
    appType: "utility",
    theme: paywall.theme,
    primitives: {},
    translations: paywall.translations,
    steps: [
      {
        id: `paywall:${paywall.id}:screen`,
        type: "paywall",
        label: paywall.name,
        layout: {
          ...(paywall.layout ?? {}),
          preset: paywall.layout?.preset ?? "content_focused",
          bg:
            paywall.layout?.bg ??
            ({
              type: "solid",
              color: paywall.theme?.colors?.neutral ?? "#FFFFFF",
            } as const),
          fontFamily: paywall.layout?.fontFamily ?? paywall.theme?.fonts?.body,
        },
        primitives: paywall.primitives as PaywallStep["primitives"],
      },
    ],
  };
}

export function SubscriptionPaywall(props: SubscriptionPaywallProps) {
  const runtimeOptions = useOnbornRuntimeConfig(props);
  const sessionId = useMemo(
    () =>
      `paywall-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    [runtimeOptions.paywallId],
  );
  const runtimeUserId = useMemo(
    () => runtimeOptions.userId ?? createRuntimeAnonymousUserId("paywall"),
    [runtimeOptions.userId],
  );
  const locale = useMemo(
    () => resolveRuntimeLocale(runtimeOptions.locale),
    [runtimeOptions.locale],
  );
  const platform =
    runtimeOptions.platform ?? (Platform.OS === "android" ? "android" : "ios");
  const client = useMemo(
    () =>
      createInternalClient({
        apiKey: runtimeOptions.apiKey,
        flowId: `paywall:${runtimeOptions.paywallId}`,
        userId: runtimeUserId,
        locale,
        appId: runtimeOptions.appId,
        platform,
        country: runtimeOptions.country,
        appVersion: runtimeOptions.appVersion,
        userType: runtimeOptions.userType,
        sdkVersion: runtimeOptions.sdkVersion,
        fetchImpl: runtimeOptions.fetchImpl,
      }),
    [
      runtimeOptions.apiKey,
      runtimeOptions.appId,
      runtimeOptions.appVersion,
      runtimeOptions.country,
      runtimeOptions.fetchImpl,
      locale,
      runtimeOptions.paywallId,
      platform,
      runtimeUserId,
      runtimeOptions.sdkVersion,
      runtimeOptions.userType,
    ],
  );
  useAnalyticsAppStateFlush(client);
  const [response, setResponse] = useState<GetPaywallResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        const nextResponse = await client.loadPaywall(runtimeOptions.paywallId);
        const products = runtimeOptions.billingAdapter?.loadProducts
          ? await loadLocalizedProducts(runtimeOptions.billingAdapter, {
              paywall: nextResponse.paywall,
              offering: nextResponse.offering,
              products: nextResponse.products,
              userId: runtimeUserId,
            })
          : nextResponse.products;
        if (!cancelled) {
          setResponse({ ...nextResponse, products });
        }
      } catch {
        if (!cancelled) {
          setResponse(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [
    client,
    runtimeOptions.billingAdapter,
    runtimeOptions.paywallId,
    runtimeUserId,
  ]);

  if (!response) {
    return (
      <InitialLoadingFallback
        InitialLoadingComponent={props.InitialLoadingComponent}
        kind="paywall"
        loading={loading}
        paywallId={runtimeOptions.paywallId}
      />
    );
  }

  return (
    <SubscriptionFlowInternal
      flow={paywallToFlowConfig(
        applyPaywallTranslations(response.paywall, locale),
      )}
      client={client}
      sessionId={sessionId}
      userId={runtimeUserId}
      experimentContext={response.experiment ?? null}
      variantId={response.experiment?.variantId}
      disableStepNavigation
      paywallContext={{
        paywall: response.paywall,
        offering: response.offering,
        products: response.products,
        experiment: response.experiment,
        platform,
        presentationMode: "standalone",
      }}
      platform={platform}
      billingAdapter={runtimeOptions.billingAdapter}
      onStartTrial={props.onStartTrial}
      onPurchaseStarted={props.onPurchaseStarted}
      onPurchaseCompleted={props.onPurchaseCompleted}
      onPurchaseFailed={props.onPurchaseFailed}
      onRestoreCompleted={props.onRestoreCompleted}
      onRestoreFailed={props.onRestoreFailed}
      onEntitlementsChanged={props.onEntitlementsChanged}
      onPaywallShown={props.onPaywallShown}
      onFlowCompleted={props.onFlowCompleted}
    />
  );
}

function InitialLoadingFallback({
  InitialLoadingComponent,
  flowId,
  kind,
  loading,
  paywallId,
}: InitialLoadingComponentProps & {
  InitialLoadingComponent?: React.ComponentType<InitialLoadingComponentProps>;
  loading: boolean;
}) {
  if (!loading) {
    return <View style={styles.publicFallback} />;
  }
  if (InitialLoadingComponent) {
    return (
      <InitialLoadingComponent
        flowId={flowId}
        kind={kind}
        paywallId={paywallId}
      />
    );
  }
  return (
    <View style={styles.publicFallback}>
      <ActivityIndicator />
    </View>
  );
}

function injectRuntimePaywallSteps(
  flow: FlowConfig | RuntimeFlowConfig,
  paywalls: GetFlowResponse["paywalls"],
): {
  flow: RuntimeFlowConfig;
  paywallContextByStepId: Record<
    string,
    {
      paywall: GetFlowResponse["paywalls"][number]["paywall"];
      offering?: GetFlowResponse["paywalls"][number]["offering"];
      products: GetFlowResponse["paywalls"][number]["products"];
      experiment?: GetFlowResponse["paywalls"][number]["experiment"];
      presentationMode?: "standalone" | "flow";
    }
  >;
} {
  if (paywalls.length === 0) {
    return { flow, paywallContextByStepId: {} };
  }

  const paywallContextByStepId: Record<
    string,
    {
      paywall: GetFlowResponse["paywalls"][number]["paywall"];
      offering?: GetFlowResponse["paywalls"][number]["offering"];
      products: GetFlowResponse["paywalls"][number]["products"];
      experiment?: GetFlowResponse["paywalls"][number]["experiment"];
      presentationMode?: "standalone" | "flow";
    }
  > = {};
  let steps: RuntimeStep[] = [...flow.steps];

  paywalls.forEach((entry) => {
    const step = paywallToRuntimeStep(entry.paywall);
    paywallContextByStepId[step.id] = {
      paywall: entry.paywall,
      offering: entry.offering,
      products: entry.products,
      experiment: entry.experiment,
      presentationMode: "flow",
    };

    if (entry.placement.placement === "after_step" && entry.placement.stepId) {
      const targetIndex = steps.findIndex(
        (candidate) => candidate.id === entry.placement.stepId,
      );
      if (targetIndex >= 0) {
        steps = [
          ...steps.slice(0, targetIndex + 1),
          step,
          ...steps.slice(targetIndex + 1),
        ];
        return;
      }
    }

    if (entry.placement.placement === "flow_end") {
      steps = [...steps, step];
    }
  });

  return {
    flow: {
      ...flow,
      steps,
    },
    paywallContextByStepId,
  };
}

function paywallToRuntimeStep(paywall: PaywallConfig): PaywallStep {
  return {
    id: `paywall:${paywall.id}`,
    type: "paywall",
    label: paywall.name,
    layout: {
      ...(paywall.layout ?? {}),
      preset: paywall.layout?.preset ?? "content_focused",
      safeArea: paywall.layout?.safeArea ?? true,
      bg:
        paywall.layout?.bg ??
        ({
          type: "solid",
          color: paywall.theme?.colors?.neutral ?? "#FFFFFF",
        } as const),
      fontFamily: paywall.layout?.fontFamily ?? paywall.theme?.fonts?.body,
    },
    primitives: normalizePaywallContentSlots(
      paywall.primitives,
    ) as PaywallStep["primitives"],
  };
}

function normalizePaywallContentSlots(
  primitives: PaywallConfig["primitives"],
): PaywallConfig["primitives"] {
  type NormalizedSlot = "hero" | "content" | "bottom";
  type PrimitiveEntry = {
    key: string;
    value: unknown;
    index: number;
    order: number;
    slot: NormalizedSlot;
    sourceSlotRank: number;
  };

  const entries: PrimitiveEntry[] = Object.entries(primitives ?? {}).map(
    ([key, value], index) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {
          key,
          value,
          index,
          order: index,
          slot: "content",
          sourceSlotRank: 1,
        };
      }
      const primitive = value as { order?: unknown; slot?: unknown };
      const normalizedSlot =
        primitive.slot === "hero"
          ? "hero"
          : primitive.slot === "bottom"
            ? "bottom"
            : "content";
      return {
        key,
        value,
        index,
        order: typeof primitive.order === "number" ? primitive.order : index,
        slot: normalizedSlot,
        sourceSlotRank: primitive.slot === "top" ? 0 : 1,
      };
    },
  );
  const next: Record<string, unknown> = {};
  for (const slot of ["hero", "content", "bottom"] as const) {
    entries
      .filter((entry) => entry.slot === slot)
      .sort(
        (a, b) =>
          a.sourceSlotRank - b.sourceSlotRank ||
          a.order - b.order ||
          a.index - b.index,
      )
      .forEach((entry, order) => {
        if (
          !entry.value ||
          typeof entry.value !== "object" ||
          Array.isArray(entry.value)
        ) {
          next[entry.key] = entry.value;
          return;
        }
        next[entry.key] = {
          ...(entry.value as Record<string, unknown>),
          slot,
          order,
        };
      });
  }
  return next as PaywallConfig["primitives"];
}

export function SubscriptionFlowInternal(props: SubscriptionFlowInternalProps) {
  useEffect(() => {
    props.client.setExperimentContext(props.experimentContext ?? null);
    return () => {
      props.client.setExperimentContext(null);
    };
  }, [props.client, props.experimentContext]);

  const runtimePaywallState = useMemo(
    () => injectRuntimePaywallSteps(props.flow, props.paywalls ?? []),
    [props.flow, props.paywalls],
  );
  const runtimeFlow = runtimePaywallState.flow;
  const requestedFontFamilies = useMemo(
    () => extractFontFamilies(runtimeFlow),
    [runtimeFlow],
  );
  const [fontsLoaded, fontsError] = useOnbornFonts(requestedFontFamilies);
  const {
    currentStep,
    stepIndex,
    onBack: navigateBack,
    onSkip: navigateSkip,
    onNext: navigateNext,
    transitionDirection,
  } = useSubscriptionFlowInner({
    flow: runtimeFlow,
    client: props.client,
    initialStepId: props.initialStepId,
    sessionId: props.sessionId,
    variantId: props.variantId,
    onBack: props.onBack,
    onSkip: props.onSkip,
    onNextStep: props.onNextStep,
    onFlowCompleted: props.onFlowCompleted,
    stepTransitionMs: props.stepTransitionMs,
  });

  const component = currentStep
    ? DEFAULT_STEP_COMPONENTS[currentStep.type]
    : null;
  const flowPrimitives = useMemo(
    () =>
      filterPrimitivesForStep(
        primitivesMapToInstances(runtimeFlow.primitives ?? {}),
        currentStep?.id,
      ),
    [currentStep?.id, runtimeFlow.primitives],
  );
  const progressScope = useMemo(
    () => resolveProgressScope(runtimeFlow.steps, currentStep?.id),
    [currentStep?.id, runtimeFlow.steps],
  );
  const progressSegments = useMemo(
    () => buildProgressSegments(runtimeFlow.steps),
    [runtimeFlow.steps],
  );
  const [flowValues, setFlowValues] = useState<Record<string, PrimitiveValue>>(
    () => extractFlowValues(runtimeFlow),
  );
  const triggeredStoreReviewStepsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    setFlowValues(extractFlowValues(runtimeFlow));
    triggeredStoreReviewStepsRef.current.clear();
  }, [runtimeFlow]);
  const handlePrimitiveValueChange = useCallback(
    (step: RuntimeStep, primitiveId: string, value: PrimitiveValue) => {
      setFlowValues((current) => ({
        ...current,
        [primitiveId]: value,
        [`${step.id}.${primitiveId}`]: value,
      }));
    },
    [],
  );
  const basePaywallContext =
    (currentStep
      ? runtimePaywallState.paywallContextByStepId[currentStep.id]
      : undefined) ?? props.paywallContext;
  const [localizedPaywallProducts, setLocalizedPaywallProducts] = useState<
    BillingProduct[] | null
  >(null);
  useEffect(() => {
    let cancelled = false;
    setLocalizedPaywallProducts(null);
    if (!props.billingAdapter?.loadProducts || !basePaywallContext?.offering) {
      return () => {
        cancelled = true;
      };
    }
    void props.billingAdapter
      .loadProducts({
        paywall: basePaywallContext.paywall,
        offering: basePaywallContext.offering,
        products: basePaywallContext.products ?? [],
        userId: props.userId,
      })
      .then((products) => {
        if (!cancelled) {
          setLocalizedPaywallProducts(products);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLocalizedPaywallProducts(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    basePaywallContext?.offering,
    basePaywallContext?.paywall,
    basePaywallContext?.products,
    props.billingAdapter,
    props.userId,
  ]);
  const effectiveBasePaywallContext = useMemo(() => {
    if (!basePaywallContext) {
      return undefined;
    }
    return {
      ...basePaywallContext,
      products: localizedPaywallProducts ?? basePaywallContext.products,
    };
  }, [basePaywallContext, localizedPaywallProducts]);
  const paywallPlatform =
    props.platform ?? (Platform.OS === "android" ? "android" : "ios");
  const paywallExperiment = effectiveBasePaywallContext?.experiment;
  const paywallVariantId = paywallExperiment?.variantId ?? props.variantId;
  const paywallPackages = useMemo(
    () =>
      getPackagesWithProducts(
        effectiveBasePaywallContext?.offering,
        effectiveBasePaywallContext?.products,
        paywallPlatform,
      ),
    [
      effectiveBasePaywallContext?.offering,
      effectiveBasePaywallContext?.products,
      paywallPlatform,
    ],
  );
  const packageSelectorDefaultPackageId = useMemo(
    () =>
      resolveStepPackageSelectorDefaultPackageId(currentStep, paywallPackages),
    [currentStep, paywallPackages],
  );
  const resolvedDefaultPaywallPackageId =
    packageSelectorDefaultPackageId ??
    resolveDefaultPackageId(effectiveBasePaywallContext?.offering);
  const [selectedPaywallPackageId, setSelectedPaywallPackageId] = useState<
    string | undefined
  >(() => resolvedDefaultPaywallPackageId);
  const autoSelectedPaywallPackageIdRef = useRef<string | undefined>(
    resolvedDefaultPaywallPackageId,
  );
  const [paywallPurchasing, setPaywallPurchasing] = useState(false);
  const [paywallRestoring, setPaywallRestoring] = useState(false);
  const paywallEnteredAtRef = useRef(Date.now());
  useEffect(() => {
    paywallEnteredAtRef.current = Date.now();
  }, [currentStep?.id]);
  const paywallViewedRef = useRef<Set<string>>(new Set());
  const shownPaywall = basePaywallContext?.paywall;
  const shownPaywallStepId =
    currentStep?.id ??
    (shownPaywall ? `paywall:${shownPaywall.id}:screen` : undefined);
  useEffect(() => {
    if (!shownPaywall || !shownPaywallStepId) {
      return;
    }
    const key = `${props.sessionId}:${shownPaywallStepId}`;
    if (paywallViewedRef.current.has(key)) {
      return;
    }
    paywallViewedRef.current.add(key);
    props.onPaywallShown?.({
      paywallId: shownPaywall.id,
      paywallName: shownPaywall.name,
      stepId: shownPaywallStepId,
    });
    void props.client
      .trackPaywallViewed({
        sessionId: props.sessionId,
        stepId: shownPaywallStepId,
        paywallId: shownPaywall.id,
        paywallTemplate: shownPaywall.name,
        variant: paywallVariantId,
        experiment: paywallExperiment,
      })
      .then(() => props.client.flushEvents())
      .catch(() => {
        // Paywall rendering must never be blocked by analytics transport.
      });
  }, [
    props.client,
    props.onPaywallShown,
    props.sessionId,
    paywallExperiment,
    paywallVariantId,
    shownPaywall,
    shownPaywallStepId,
  ]);
  const selectedPaywallPackage = useMemo(
    () =>
      findPackageWithProduct(paywallPackages, selectedPaywallPackageId) ??
      findPackageWithProduct(paywallPackages, resolvedDefaultPaywallPackageId),
    [
      paywallPackages,
      resolvedDefaultPaywallPackageId,
      selectedPaywallPackageId,
    ],
  );
  useEffect(() => {
    setSelectedPaywallPackageId((current) => {
      const currentIsValid = Boolean(
        current &&
        effectiveBasePaywallContext?.offering?.packages.some(
          (billingPackage) => billingPackage.id === current,
        ),
      );
      if (
        currentIsValid &&
        current !== autoSelectedPaywallPackageIdRef.current
      ) {
        return current;
      }
      autoSelectedPaywallPackageIdRef.current = resolvedDefaultPaywallPackageId;
      return resolvedDefaultPaywallPackageId;
    });
  }, [effectiveBasePaywallContext?.offering, resolvedDefaultPaywallPackageId]);
  const progressValue =
    progressScope.count > 0
      ? ((progressScope.index + 1) / progressScope.count) * 100
      : 0;
  const stepTransitionMs = props.stepTransitionMs ?? STEP_TRANSITION_MS;
  const stepTransitions = useMemo(
    () => createStepTransitionAnimations(transitionDirection, stepTransitionMs),
    [stepTransitionMs, transitionDirection],
  );
  const handleBack = props.disableStepNavigation ? noop : navigateBack;
  const handleSkip = props.disableStepNavigation ? noop : navigateSkip;
  const handleNext = props.disableStepNavigation ? noopNext : navigateNext;
  const {
    billingAdapter,
    client,
    disableStepNavigation,
    onPurchaseCompleted,
    onPurchaseFailed,
    onPurchaseStarted,
    onStartTrial,
    onEntitlementsChanged,
    onRestoreCompleted,
    onRestoreFailed,
    sessionId,
    userId,
  } = props;
  const handlePaywallPurchase = useCallback(
    async (intent?: "purchase" | "trial") => {
      if (!basePaywallContext?.paywall || !basePaywallContext.offering) {
        return;
      }
      if (!selectedPaywallPackage) {
        onPurchaseFailed?.(new Error("No paywall package selected"));
        return;
      }
      if (!billingAdapter) {
        onPurchaseFailed?.(
          new Error("Missing ONBORN billingAdapter for paywall purchase."),
        );
        return;
      }

      if (intent === "trial") {
        try {
          const shouldContinue = await onStartTrial?.(selectedPaywallPackage);
          if (shouldContinue === false) {
            return;
          }
        } catch (error) {
          onPurchaseFailed?.(toError(error));
          return;
        }
      }

      onPurchaseStarted?.(selectedPaywallPackage);
      setPaywallPurchasing(true);
      const purchaseStepId =
        currentStep?.id ?? `paywall:${basePaywallContext.paywall.id}:screen`;
      const purchaseProductId =
        selectedPaywallPackage.product?.storeProductId ??
        selectedPaywallPackage.package.productId;
      void client
        .trackPaywallPurchaseStarted({
          sessionId,
          stepId: purchaseStepId,
          paywallId: basePaywallContext.paywall.id,
          paywallTemplate: basePaywallContext.paywall.name,
          packageId: selectedPaywallPackage.package.id,
          productId: purchaseProductId,
          variant: paywallVariantId,
          experiment: paywallExperiment,
        })
        .then(() => client.flushEvents())
        .catch(() => {
          // Purchase must never be blocked by analytics transport.
        });
      if (intent === "trial") {
        void client
          .trackPaywallTrialStarted({
            sessionId,
            stepId: purchaseStepId,
            paywallId: basePaywallContext.paywall.id,
            paywallTemplate: basePaywallContext.paywall.name,
            packageId: selectedPaywallPackage.package.id,
            productId: purchaseProductId,
            trialPeriod: selectedPaywallPackage.product?.trialPeriod,
            variant: paywallVariantId,
            experiment: paywallExperiment,
          })
          .then(() => client.flushEvents())
          .catch(() => {
            // Trial analytics must never block store purchase.
          });
      }
      try {
        const adapterResult = await billingAdapter.purchasePackage({
          paywall: basePaywallContext.paywall,
          offering: basePaywallContext.offering,
          package: selectedPaywallPackage.package,
          product: selectedPaywallPackage.product,
          userId,
        });
        const result = adapterResult.success
          ? await validateBillingPurchase({
              client,
              paywall: basePaywallContext.paywall,
              offering: basePaywallContext.offering,
              item: selectedPaywallPackage,
              result: adapterResult,
            })
          : adapterResult;
        onPurchaseCompleted?.(result);
        notifyEntitlementsChanged(result.entitlements, onEntitlementsChanged);
        if (result.success && result.status === "validated") {
          await client.trackPaywallConverted({
            sessionId,
            stepId: purchaseStepId,
            paywallId: basePaywallContext.paywall.id,
            paywallTemplate: basePaywallContext.paywall.name,
            productId: purchaseProductId,
            variant: paywallVariantId,
            experiment: paywallExperiment,
          });
          await client.flushEvents();
          if (!disableStepNavigation) {
            navigateNext({ converted: true });
          }
        } else if (!result.success) {
          void client
            .trackPaywallPurchaseFailed({
              sessionId,
              stepId: purchaseStepId,
              paywallId: basePaywallContext.paywall.id,
              paywallTemplate: basePaywallContext.paywall.name,
              reason: "error",
              packageId: selectedPaywallPackage.package.id,
              productId: purchaseProductId,
              variant: paywallVariantId,
              experiment: paywallExperiment,
            })
            .then(() => client.flushEvents())
            .catch(() => {});
        }
      } catch (error) {
        onPurchaseFailed?.(toError(error));
        void client
          .trackPaywallPurchaseFailed({
            sessionId,
            stepId: purchaseStepId,
            paywallId: basePaywallContext.paywall.id,
            paywallTemplate: basePaywallContext.paywall.name,
            reason: classifyPurchaseFailureReason(error),
            packageId: selectedPaywallPackage.package.id,
            productId: purchaseProductId,
            message: toError(error).message,
            variant: paywallVariantId,
            experiment: paywallExperiment,
          })
          .then(() => client.flushEvents())
          .catch(() => {});
      } finally {
        setPaywallPurchasing(false);
      }
    },
    [
      basePaywallContext,
      billingAdapter,
      client,
      currentStep?.id,
      disableStepNavigation,
      navigateNext,
      onPurchaseCompleted,
      onPurchaseFailed,
      onPurchaseStarted,
      onStartTrial,
      onEntitlementsChanged,
      paywallExperiment,
      paywallVariantId,
      sessionId,
      selectedPaywallPackage,
      userId,
    ],
  );
  const handlePaywallRestore = useCallback(async () => {
    if (!billingAdapter?.restorePurchases) {
      onRestoreFailed?.(
        new Error("Missing restorePurchases on ONBORN billingAdapter."),
      );
      return;
    }
    setPaywallRestoring(true);
    const restorePaywall = effectiveBasePaywallContext?.paywall;
    const restoreStepId =
      currentStep?.id ??
      (restorePaywall ? `paywall:${restorePaywall.id}:screen` : undefined);
    if (restorePaywall && restoreStepId) {
      void client
        .trackPaywallRestoreStarted({
          sessionId,
          stepId: restoreStepId,
          paywallId: restorePaywall.id,
          paywallTemplate: restorePaywall.name,
          variant: paywallVariantId,
          experiment: paywallExperiment,
        })
        .then(() => client.flushEvents())
        .catch(() => {});
    }
    try {
      const adapterResult = await billingAdapter.restorePurchases({
        paywall: effectiveBasePaywallContext?.paywall,
        offering: effectiveBasePaywallContext?.offering,
        products: effectiveBasePaywallContext?.products ?? [],
        userId,
      });
      const result = await validateBillingRestore({
        client,
        offering: effectiveBasePaywallContext?.offering,
        result: adapterResult,
      });
      onRestoreCompleted?.(result);
      notifyEntitlementsChanged(result.entitlements, onEntitlementsChanged);
      if (restorePaywall && restoreStepId) {
        void client
          .trackPaywallRestoreCompleted({
            sessionId,
            stepId: restoreStepId,
            paywallId: restorePaywall.id,
            paywallTemplate: restorePaywall.name,
            restored: Boolean(result.success),
            variant: paywallVariantId,
            experiment: paywallExperiment,
          })
          .then(() => client.flushEvents())
          .catch(() => {});
      }
    } catch (error) {
      onRestoreFailed?.(toError(error));
      if (restorePaywall && restoreStepId) {
        void client
          .trackPaywallRestoreFailed({
            sessionId,
            stepId: restoreStepId,
            paywallId: restorePaywall.id,
            paywallTemplate: restorePaywall.name,
            message: toError(error).message,
            variant: paywallVariantId,
            experiment: paywallExperiment,
          })
          .then(() => client.flushEvents())
          .catch(() => {});
      }
    } finally {
      setPaywallRestoring(false);
    }
  }, [
    effectiveBasePaywallContext,
    billingAdapter,
    client,
    currentStep?.id,
    onEntitlementsChanged,
    onRestoreCompleted,
    onRestoreFailed,
    paywallExperiment,
    paywallVariantId,
    sessionId,
    userId,
  ]);
  const handlePaywallDismiss = useCallback(async () => {
    if (!basePaywallContext?.paywall) {
      return;
    }
    try {
      await client.trackPaywallDismissed({
        sessionId,
        stepId:
          currentStep?.id ?? `paywall:${basePaywallContext.paywall.id}:screen`,
        paywallId: basePaywallContext.paywall.id,
        paywallTemplate: basePaywallContext.paywall.name,
        timeSpentMs: Math.max(0, Date.now() - paywallEnteredAtRef.current),
        experiment: paywallExperiment,
      });
      await client.flushEvents();
    } catch {
      // Dismissal should not be blocked by analytics transport failures.
    }
    if (disableStepNavigation) {
      props.onFlowCompleted?.();
      return;
    }
    navigateNext({ skipped: true });
  }, [
    basePaywallContext,
    client,
    currentStep?.id,
    disableStepNavigation,
    navigateNext,
    paywallExperiment,
    props.onFlowCompleted,
    sessionId,
  ]);
  const paywallContext = useMemo<
    OnbornPaywallRuntimeContext | undefined
  >(() => {
    if (!effectiveBasePaywallContext) {
      return undefined;
    }
    if (props.disableInteractionState) {
      return {
        ...effectiveBasePaywallContext,
        platform: effectiveBasePaywallContext.platform ?? paywallPlatform,
        selectedPackageId: selectedPaywallPackage?.package.id,
      };
    }
    const contextPaywall = effectiveBasePaywallContext.paywall;
    const contextStepId =
      currentStep?.id ??
      (contextPaywall ? `paywall:${contextPaywall.id}:screen` : undefined);
    return {
      ...effectiveBasePaywallContext,
      platform: effectiveBasePaywallContext.platform ?? paywallPlatform,
      selectedPackageId: selectedPaywallPackage?.package.id,
      onSelectPackage: (packageId: string) => {
        setSelectedPaywallPackageId(packageId);
        if (!contextPaywall || !contextStepId) {
          return;
        }
        const product = findPackageWithProduct(
          paywallPackages,
          packageId,
        )?.product;
        void client
          .trackPaywallPackageSelected({
            sessionId,
            stepId: contextStepId,
            paywallId: contextPaywall.id,
            paywallTemplate: contextPaywall.name,
            packageId,
            productId: product?.storeProductId,
            variant: paywallVariantId,
            experiment: paywallExperiment,
          })
          .then(() => client.flushEvents())
          .catch(() => {});
      },
      onPurchaseSelectedPackage: () => {
        void handlePaywallPurchase();
      },
      onRestorePurchases: () => {
        void handlePaywallRestore();
      },
      onDismissPaywall: () => {
        void handlePaywallDismiss();
      },
      onLinkPress: (link: { url: string; label?: string }) => {
        if (!contextPaywall || !contextStepId) {
          return;
        }
        void client
          .trackPaywallLinkPressed({
            sessionId,
            stepId: contextStepId,
            paywallId: contextPaywall.id,
            paywallTemplate: contextPaywall.name,
            url: link.url,
            label: link.label,
            variant: paywallVariantId,
            experiment: paywallExperiment,
          })
          .then(() => client.flushEvents())
          .catch(() => {});
      },
      purchasing: paywallPurchasing,
      restoring: paywallRestoring,
    };
  }, [
    client,
    currentStep?.id,
    effectiveBasePaywallContext,
    handlePaywallPurchase,
    handlePaywallRestore,
    handlePaywallDismiss,
    paywallPackages,
    paywallPurchasing,
    paywallRestoring,
    paywallExperiment,
    paywallVariantId,
    paywallPlatform,
    props.disableInteractionState,
    selectedPaywallPackage?.package.id,
    sessionId,
  ]);
  const layoutFontFamily = resolveStepLayoutFontFamily(
    runtimeFlow,
    currentStep,
  );
  const stepFlowTheme = useMemo(() => {
    const paywallTheme = basePaywallContext?.paywall?.theme;
    if (!paywallTheme) {
      return runtimeFlow.theme;
    }
    return mergePaywallFlowTheme(runtimeFlow.theme, paywallTheme);
  }, [basePaywallContext?.paywall?.theme, runtimeFlow.theme]);

  useEffect(() => {
    if (
      props.disableStepNavigation ||
      !currentStep ||
      currentStep.type !== "loading"
    ) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      props.onLoadingEnd?.(currentStep.id);
      navigateNext();
    }, resolveLoadingStepDurationMs(currentStep));

    return () => clearTimeout(timeout);
  }, [
    currentStep,
    navigateNext,
    props.disableStepNavigation,
    props.onLoadingEnd,
  ]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (props.disableStepNavigation) {
          return false;
        }
        if (stepIndex <= 0) {
          return false;
        }
        navigateBack();
        return true;
      },
    );

    return () => subscription.remove();
  }, [navigateBack, props.disableStepNavigation, stepIndex]);

  useEffect(() => {
    const config = props.flow.storeReview;
    const triggerStepId = config?.triggerStepId;
    if (
      props.disableStepNavigation ||
      !currentStep ||
      !triggerStepId ||
      currentStep.id !== triggerStepId ||
      triggeredStoreReviewStepsRef.current.has(triggerStepId)
    ) {
      return;
    }

    triggeredStoreReviewStepsRef.current.add(triggerStepId);
    void requestStoreReview();
  }, [currentStep?.id, props.disableStepNavigation, props.flow.storeReview]);

  const themedLayoutBg = resolveThemedLayoutBg(
    currentStep?.layout.bg,
    stepFlowTheme,
  );
  const rootBackgroundColor = resolveRootBackgroundColor(themedLayoutBg);
  const rootBackgroundStyle = { backgroundColor: rootBackgroundColor };

  const subscriptionFlowChrome = (content: React.ReactNode) => (
    <SafeAreaProvider style={[styles.safeAreaProvider, rootBackgroundStyle]}>
      <TamaguiProvider config={subscriptionTamaguiConfig} defaultTheme="dark">
        <Theme name="dark">
          <View style={[styles.themeRoot, rootBackgroundStyle]}>{content}</View>
        </Theme>
      </TamaguiProvider>
    </SafeAreaProvider>
  );

  if (!fontsLoaded && !fontsError) {
    return subscriptionFlowChrome(
      <View style={[styles.container, rootBackgroundStyle]}>
        <ActivityIndicator />
      </View>,
    );
  }

  if (!currentStep || !component) {
    return subscriptionFlowChrome(
      <View style={[styles.container, rootBackgroundStyle]}>
        <ActivityIndicator />
      </View>,
    );
  }

  const StepComponent = component;

  return subscriptionFlowChrome(
    <View style={[styles.container, rootBackgroundStyle]}>
      <ResponsiveProvider
        style={styles.stepContent}
        fixedSize={props.responsiveViewport}
      >
        <StepComponent
          step={currentStep}
          stepIndex={stepIndex}
          totalSteps={runtimeFlow.steps.length}
          stepIds={runtimeFlow.steps.map((step) => step.id)}
          flowPrimitives={flowPrimitives}
          progressValue={progressValue}
          progressStepIndex={progressScope.index}
          progressStepCount={progressScope.count}
          progressSegments={progressSegments}
          flowTheme={stepFlowTheme}
          layoutFontFamily={layoutFontFamily}
          onPrimitivePress={props.onPrimitivePress}
          disableInteractionState={props.disableInteractionState}
          disableInputEditing={props.disableInputEditing}
          preserveEmptyVariableTokens={props.preserveEmptyVariableTokens}
          flowValues={flowValues}
          onPrimitiveValueChange={handlePrimitiveValueChange}
          stepAnimation={{
            key: currentStep.id,
            entering: stepTransitions.entering,
            exiting: stepTransitions.exiting,
            durationMs: stepTransitions.durationMs,
          }}
          onBack={handleBack}
          onSkip={handleSkip}
          onNext={handleNext}
          onToggleChange={props.onToggleChange}
          paywallContext={paywallContext}
          onPaywallPurchase={handlePaywallPurchase}
          onPaywallRestore={handlePaywallRestore}
          customStepRenderers={props.customStepRenderers}
          onCustomStepMissing={props.onCustomStepMissing}
        />
      </ResponsiveProvider>
    </View>,
  );
}

function noop() {
  return undefined;
}

function noopNext() {
  return undefined;
}

function createRuntimeAnonymousUserId(prefix: string): string {
  return `${prefix}-anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Unknown error");
}

/**
 * Best-effort classification of a thrown purchase error. Store SDKs (RevenueCat,
 * native IAP) surface user cancellation via `userCancelled`/cancel codes; anything
 * else is treated as a technical error so the analytics funnel can distinguish
 * "user backed out" from "purchase broke".
 */
function classifyPurchaseFailureReason(error: unknown): "cancelled" | "error" {
  if (error && typeof error === "object") {
    const candidate = error as {
      userCancelled?: unknown;
      code?: unknown;
      message?: unknown;
    };
    if (
      candidate.userCancelled === true ||
      candidate.userCancelled === "true"
    ) {
      return "cancelled";
    }
    const code =
      typeof candidate.code === "string" ? candidate.code.toUpperCase() : "";
    if (code.includes("CANCEL")) {
      return "cancelled";
    }
    const message =
      typeof candidate.message === "string"
        ? candidate.message.toLowerCase()
        : "";
    if (message.includes("cancel")) {
      return "cancelled";
    }
  }
  return "error";
}

async function loadLocalizedProducts(
  billingAdapter: OnbornBillingAdapter,
  input: Parameters<NonNullable<OnbornBillingAdapter["loadProducts"]>>[0],
) {
  if (!billingAdapter.loadProducts) {
    return input.products;
  }
  try {
    return await billingAdapter.loadProducts(input);
  } catch {
    return input.products;
  }
}

function notifyEntitlementsChanged(
  entitlements: CustomerEntitlement[] | undefined,
  callback: ((entitlements: CustomerEntitlement[]) => void) | undefined,
): void {
  if (!entitlements) {
    return;
  }
  callback?.(entitlements);
}

async function requestStoreReview(): Promise<void> {
  try {
    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
    }
  } catch {
    // Store review prompts are opportunistic and should never block onboarding.
  }
}

function resolveLoadingStepDurationMs(step: RuntimeStep): number {
  const loadingPrimitive = Object.values(step.primitives).find(
    (primitive) =>
      primitive &&
      typeof primitive === "object" &&
      !Array.isArray(primitive) &&
      (primitive as { type?: unknown }).type === "loading",
  ) as { props?: { durationMs?: unknown; messages?: unknown } } | undefined;
  const props = loadingPrimitive?.props;
  const durationMs =
    typeof props?.durationMs === "number" ? props.durationMs : 1400;
  const messageCount = Array.isArray(props?.messages)
    ? Math.max(
        1,
        props.messages.filter(
          (message): message is string =>
            typeof message === "string" && message.trim().length > 0,
        ).length,
      )
    : 1;
  return durationMs * messageCount;
}

function resolveStepLayoutFontFamily(
  flow: FlowConfig | RuntimeFlowConfig,
  step: RuntimeStep | null | undefined,
): TextFontFamily | undefined {
  return (
    flow.theme?.fonts?.body ??
    step?.layout.fontFamily ??
    flow.steps.find((flowStep) => flowStep.layout.fontFamily)?.layout.fontFamily
  );
}

function resolveThemedLayoutBg(
  bg: LayoutBg | undefined,
  theme: FlowTheme | undefined,
): LayoutBg | undefined {
  const flowTheme = resolveFlowTheme(theme);
  if (bg?.type === "image") {
    return {
      ...bg,
      overlayColor:
        resolveThemeToken(bg.overlayColor, flowTheme) ?? bg.overlayColor,
    };
  }
  if (bg?.type === "linear_gradient") {
    return bg;
  }
  if (bg?.type === "video") {
    return bg;
  }
  if (bg?.type === "solid") {
    return {
      type: "solid",
      color: resolveThemeToken(bg.color, flowTheme) ?? bg.color,
    };
  }
  return { type: "solid", color: flowTheme.colors.neutral ?? "#0E1116" };
}

function resolveRootBackgroundColor(bg: LayoutBg | undefined): string {
  if (bg?.type === "solid") {
    return bg.color;
  }
  if (bg?.type === "linear_gradient") {
    return resolveGradientSolidColor(bg, "#000000");
  }
  return "#000000";
}

function resolveStepPackageSelectorDefaultPackageId(
  step: RuntimeStep | null | undefined,
  packages: OnbornPackageWithProduct[],
): string | undefined {
  if (!step || packages.length === 0) {
    return undefined;
  }
  const packageIds = new Set(packages.map((item) => item.package.id));
  return resolvePackageSelectorDefaultFromInstances(
    primitivesMapToInstances(step.primitives),
    packageIds,
  );
}

function resolvePackageSelectorDefaultFromInstances(
  instances: PrimitiveInstance[],
  packageIds: Set<string>,
): string | undefined {
  const orderedInstances = [...instances].sort((a, b) => a.order - b.order);
  for (const instance of orderedInstances) {
    const resolved = resolvePackageSelectorDefaultFromPrimitive(
      instance.type,
      instance.props,
      packageIds,
    );
    if (resolved) {
      return resolved;
    }

    const children = instance.props.children;
    if (
      (instance.type === "x_stack" || instance.type === "y_stack") &&
      Array.isArray(children)
    ) {
      const childResolved = resolvePackageSelectorDefaultFromChildren(
        children,
        packageIds,
      );
      if (childResolved) {
        return childResolved;
      }
    }
  }
  return undefined;
}

function resolvePackageSelectorDefaultFromChildren(
  children: unknown[],
  packageIds: Set<string>,
): string | undefined {
  for (const child of children) {
    if (!child || typeof child !== "object" || Array.isArray(child)) {
      continue;
    }
    const record = child as Record<string, unknown>;
    if (
      record.visible === false ||
      typeof record.type !== "string" ||
      !record.props ||
      typeof record.props !== "object" ||
      Array.isArray(record.props)
    ) {
      continue;
    }

    const props = record.props as Record<string, unknown>;
    const resolved = resolvePackageSelectorDefaultFromPrimitive(
      record.type,
      props,
      packageIds,
    );
    if (resolved) {
      return resolved;
    }

    const nestedChildren = props.children;
    if (
      (record.type === "x_stack" || record.type === "y_stack") &&
      Array.isArray(nestedChildren)
    ) {
      const nestedResolved = resolvePackageSelectorDefaultFromChildren(
        nestedChildren,
        packageIds,
      );
      if (nestedResolved) {
        return nestedResolved;
      }
    }
  }
  return undefined;
}

function resolvePackageSelectorDefaultFromPrimitive(
  type: string,
  props: Record<string, unknown>,
  packageIds: Set<string>,
): string | undefined {
  if (
    type !== "package_selector" &&
    type !== "package_card" &&
    type !== "package_list"
  ) {
    return undefined;
  }

  const selector = normalizePackageSelectorProps(type, props);
  const candidate = selector.singlePackage
    ? selector.packageId
    : selector.selectedPackageId;
  return candidate && packageIds.has(candidate) ? candidate : undefined;
}

function filterPrimitivesForStep(
  primitives: PrimitiveInstance[],
  stepId: string | undefined,
): PrimitiveInstance[] {
  if (stepId && isPaywallStepId(stepId)) {
    return [];
  }

  return primitives.filter((primitive) => {
    const visibility = primitive.visibility;
    if (!visibility || visibility.mode === "all") {
      return true;
    }
    if (!stepId) {
      return false;
    }
    const stepIds = (visibility.stepIds ?? []).filter(
      (id) => !isPaywallStepId(id),
    );
    if (visibility.mode === "include_steps") {
      return stepIds.includes(stepId);
    }
    return !stepIds.includes(stepId);
  });
}

function resolveProgressScope(
  steps: RuntimeStep[],
  currentStepId: string | undefined,
): { index: number; count: number } {
  if (steps.length === 0) {
    return { index: 0, count: 0 };
  }

  const segments = buildProgressSegments(steps);
  const currentSegmentIndex = currentStepId
    ? segments.findIndex((segment) => segment.includes(currentStepId))
    : -1;
  if (currentSegmentIndex >= 0) {
    return { index: currentSegmentIndex, count: segments.length };
  }

  const fallbackIndex = currentStepId
    ? steps.findIndex((step) => step.id === currentStepId)
    : 0;
  return {
    index: Math.max(0, Math.min(segments.length - 1, fallbackIndex)),
    count: segments.length,
  };
}

function buildProgressSegments(steps: RuntimeStep[]): string[][] {
  const quizAnswerStepIds = new Set(
    steps
      .filter(
        (step) => step.type === "quiz_answer" && !isPaywallStepId(step.id),
      )
      .map((step) => step.id),
  );
  const consumedQuizAnswerStepIds = new Set<string>();
  const segments: string[][] = [];

  for (const step of steps) {
    if (isPaywallStepId(step.id)) {
      continue;
    }

    if (consumedQuizAnswerStepIds.has(step.id)) {
      continue;
    }

    segments.push([step.id]);

    if (step.type !== "quiz") {
      continue;
    }

    const targetIds = collectProgressQuizAnswerTargetIdsForStep(
      step,
      quizAnswerStepIds,
    );
    if (targetIds.length === 0) {
      continue;
    }

    segments.push(targetIds);
    targetIds.forEach((targetId) => consumedQuizAnswerStepIds.add(targetId));
  }

  return segments;
}

function collectProgressQuizAnswerTargetIdsForStep(
  step: RuntimeStep,
  quizAnswerStepIds: Set<string>,
): string[] {
  const targetIds = new Set<string>();
  Object.values(step.primitives).forEach((primitive) => {
    collectProgressQuizAnswerTargetIds(primitive, targetIds);
  });
  return [...targetIds].filter((targetId) => quizAnswerStepIds.has(targetId));
}

function collectProgressQuizAnswerTargetIds(
  primitive: unknown,
  targetIds: Set<string>,
) {
  if (!primitive || typeof primitive !== "object" || Array.isArray(primitive)) {
    return;
  }

  const record = primitive as { type?: unknown; props?: unknown };
  if (
    !record.props ||
    typeof record.props !== "object" ||
    Array.isArray(record.props)
  ) {
    return;
  }

  const props = record.props as Record<string, unknown>;
  if (record.type === "quiz" && Array.isArray(props.options)) {
    props.options.forEach((option) => {
      if (!option || typeof option !== "object" || Array.isArray(option)) {
        return;
      }
      const nextStepId = (option as { nextStepId?: unknown }).nextStepId;
      if (typeof nextStepId === "string" && nextStepId.trim()) {
        targetIds.add(nextStepId.trim());
      }
    });
  }

  if (Array.isArray(props.children)) {
    props.children.forEach((child) =>
      collectProgressQuizAnswerTargetIds(child, targetIds),
    );
  }
}

function resolveProgressValueForPrimitive(
  primitive: PrimitiveInstance,
  currentStepId: string,
  globalStepIndex: number,
  globalStepCount: number,
): number | undefined {
  const scope = resolveProgressScopeForPrimitive(
    primitive,
    currentStepId,
    globalStepIndex,
    globalStepCount,
  );
  return scope.count > 0 ? ((scope.index + 1) / scope.count) * 100 : 0;
}

function resolveProgressScopeForPrimitive(
  _primitive: PrimitiveInstance,
  _currentStepId: string,
  globalStepIndex: number,
  globalStepCount: number,
): { index: number; count: number } {
  return {
    index: globalStepIndex,
    count: globalStepCount,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  themeRoot: {
    flex: 1,
  },
  safeAreaProvider: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
  },
  nativeCustomContent: {
    width: "100%",
    minWidth: 0,
    flexShrink: 0,
    alignSelf: "stretch",
    alignItems: "center",
  },
  publicFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
});
