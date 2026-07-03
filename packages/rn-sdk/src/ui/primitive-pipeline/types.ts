import type { LayoutPresetConfig } from "../../config/layout";
import type {
  CTAButtonAction,
  FlowTheme,
  LayoutBg,
  TextFontFamily,
} from "@onborn/sdk-contracts";
import type { OnbornPaywallRuntimeContext } from "../../paywall";
import type React from "react";

export type PrimitiveValue = string | number | boolean;

export type Slot = "top" | "hero" | "content" | "bottom";

export interface PrimitiveInstance {
  id?: string;
  type: string;
  slot: Slot;
  order: number;
  visible?: boolean;
  visibility?: {
    mode: "all" | "include_steps" | "exclude_steps";
    stepIds?: string[];
  };
  props: Record<string, unknown>;
}

export type SlotMap = Record<Slot, PrimitiveInstance[]>;

export type SlottedNodes = Record<Slot, React.ReactNode[]> & {
  heroOverlayTop: React.ReactNode[];
  heroOverlayBottom: React.ReactNode[];
};

export type PrimitiveRenderOptions = {
  /** Builder preview only: selects a rendered primitive by its instance id. */
  onPrimitivePress?: (primitiveId: string) => void;
  /** Builder preview only: namespaces primitive ids, e.g. step:subtitle vs flow:subtitle. */
  selectableIdPrefix?: string;
  /** Current flow step id, used for per-primitive visibility inside nested stacks. */
  currentStepId?: string;
  /** Builder preview only: disables visual hover/press feedback on interactive primitives. */
  disableInteractionState?: boolean;
  /** Builder preview only: prevents text inputs from receiving typed values. */
  disableInputEditing?: boolean;
  /** Applied to `cta_button` when props do not define `onPress`. */
  onCtaPress?: (action?: CTAButtonAction) => void;
  /** Marks individual CTA actions as unavailable without changing primitive props. */
  isCtaActionDisabled?: (action: CTAButtonAction) => boolean;
  /** Applied to `back_button` when props do not define `onPress`. */
  onBackPress?: () => void;
  /** Applied to `skip_button` when props do not define `onPress`. */
  onSkipPress?: () => void;
  /** Applied to value-emitting primitives. */
  primitiveValues?: Record<string, PrimitiveValue>;
  /** Values available for text interpolation, e.g. `{{name}}` or `{{welcome.name}}`. */
  variableValues?: Record<string, PrimitiveValue>;
  /** Keeps unresolved/empty interpolation tokens visible for builder editing surfaces. */
  preserveEmptyVariableTokens?: boolean;
  /** Deprecated internal alias used by input primitives. */
  inputValues?: Record<string, PrimitiveValue>;
  onInputChange?: (inputId: string, text: string) => void;
  onPrimitiveValueChange?: (primitiveId: string, value: PrimitiveValue) => void;
  onToggleChange?: (event: {
    primitiveId: string;
    toggleId?: string;
    value: boolean;
  }) => void;
  /** Applied to `progress_bar` primitives. Computed by SubscriptionFlow from current step / all steps. */
  progressValue?: number;
  /** Zero-based active step index for step-count-based progress variants. */
  progressStepIndex?: number;
  /** Total runtime step count for step-count-based progress variants. */
  progressStepCount?: number;
  getProgressValue?: (primitive: PrimitiveInstance) => number | undefined;
  getProgressScope?: (
    primitive: PrimitiveInstance,
  ) => { index: number; count: number } | undefined;
  /** Native runtime only: keeps progress animation continuous if persistent flow chrome remounts. */
  persistProgressAnimation?: boolean;
  /** RN layout: `config/layout` preset config. */
  layout?: LayoutPresetConfig;
  /** Full-screen background paint from step.layout.bg. */
  layoutBg?: LayoutBg;
  /** Default text font family inherited from step.layout.fontFamily. */
  layoutFontFamily?: TextFontFamily;
  /** Flow-level design tokens used as primitive defaults. */
  flowTheme?: FlowTheme;
  /** Paywall runtime data used by paywall primitives. */
  paywallContext?: OnbornPaywallRuntimeContext;
  /** Adds native top/bottom safe area insets to layout spacing. */
  layoutSafeArea?: boolean;
  /** Keeps focused inputs visible without exposing the outer app background. */
  layoutKeyboardAware?: boolean;
  responsive?: {
    scaleSpace: (value: number) => number;
    scaleRadius: (value: number) => number;
  };
};
