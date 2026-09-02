import type { BuilderV2ProjectSurface } from "./builder-v2-project";
import type { BuilderV2UiIrJsonValue } from "./builder-v2-ui-ir-primitives";

export const BUILDER_V2_RUNTIME_CAPABILITIES_VERSION = 1 as const;

export type BuilderV2RuntimeNavigation = {
  continue(): void;
  back(): void;
  complete(): void;
  dismiss(): void;
};

/*
 * `wrap` is gone from the authoring surface.
 *
 * A handler is one call in the published dialect, so a wrapped one cannot be
 * compiled — the artifact answers "runtime.interactions.wrap is not a supported
 * semantic host action". It was offered here and documented in the runtime API
 * manifest, which invited screens to write precisely the shape that can never
 * ship. `trigger` records the same event and does compile.
 */
export type BuilderV2RuntimeInteractions = {
  trigger(interactionId: string): void;
};

export type BuilderV2RuntimeLocalization = {
  getLocale(): string;
  subscribe(listener: () => void): () => void;
};

export type BuilderV2RuntimeBillingErrorCode =
  | "invalid_request"
  | "invalid_surface"
  | "operation_in_progress"
  | "user_cancelled"
  | "already_owned"
  | "store_unavailable"
  | "network_error"
  | "product_unavailable"
  | "validation_failed"
  | "not_allowed"
  | "unknown";

export type BuilderV2RuntimePurchaseResult =
  | {
      readonly status: "completed";
      readonly packageId: string;
      readonly productId: string;
      readonly entitlementKeys: readonly string[];
    }
  | {
      readonly status: "pending";
      readonly packageId: string;
      readonly productId?: string;
    }
  | {
      readonly status: "cancelled";
      readonly packageId: string;
    }
  | {
      readonly status: "failed";
      readonly packageId: string;
      readonly code: BuilderV2RuntimeBillingErrorCode;
      readonly message: string;
    };

export type BuilderV2RuntimeRestoreResult =
  | {
      readonly status: "completed";
      readonly entitlementKeys: readonly string[];
    }
  | {
      readonly status: "empty";
    }
  | {
      readonly status: "failed";
      readonly code: BuilderV2RuntimeBillingErrorCode;
      readonly message: string;
    };

export type BuilderV2RuntimeBillingPeriod = {
  readonly unit: "day" | "week" | "month" | "year";
  readonly count: number;
};

export type BuilderV2RuntimeBillingOffer = {
  readonly type: "introductory" | "promotional";
  readonly price?: string;
  readonly priceAmount?: number;
  readonly currency?: string;
  readonly paymentMode?:
    | "free_trial"
    | "pay_as_you_go"
    | "pay_up_front"
    | "unknown";
  readonly period?: BuilderV2RuntimeBillingPeriod;
  readonly periodCount?: number;
};

export type BuilderV2RuntimeBillingPackage = {
  readonly id: string;
  readonly productId?: string;
  readonly title: string;
  readonly description?: string;
  readonly badge?: string;
  readonly isHighlighted: boolean;
  readonly price?: string;
  readonly priceAmount?: number;
  readonly currency?: string;
  readonly billingPeriod?: BuilderV2RuntimeBillingPeriod;
  readonly introOffer?: BuilderV2RuntimeBillingOffer;
};

export type BuilderV2RuntimeBillingSnapshot = {
  readonly status: "loading" | "ready" | "unavailable";
  readonly packages: readonly BuilderV2RuntimeBillingPackage[];
  readonly selectedPackageId: string | null;
  readonly purchasing: boolean;
  readonly restoring: boolean;
};

/**
 * One plan of the loaded offering, as a screen reads it.
 *
 * Every field is a string a screen puts on the page. The values come from the
 * store in the customer's own currency, which is why none of them may be
 * written into source.
 */
export type BuilderV2RuntimeBillingPlan = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly badge: string;
  readonly price: string;
  readonly period: string;
  readonly trial: string;
};

/**
 * The two documents a paywall has to be able to open.
 *
 * Required, and for the same reason billing is: guideline 3.1.2 refuses a
 * paywall that cannot reach its Terms of Service and Privacy Policy, so a
 * screen that had to check for these first would have no answer when they were
 * missing. The URLs live in the project, not in the screen — a screen names the
 * document and the host opens whatever is configured for the release.
 *
 * This group existed everywhere except here: the compiler accepted the calls as
 * host actions, the guidelines instructed screens to make them, and the paywall
 * contract refused any paywall without them — while the capability type carried
 * no `links` at all. Screens wrote the calls they were told to write and could
 * not typecheck; one run spent its final three repairs on "Property 'links'
 * does not exist" and was thrown away.
 */
export type BuilderV2RuntimeLinks = {
  openTerms(): Promise<void>;
  openPrivacy(): Promise<void>;
};

/**
 * What a screen may do with billing.
 *
 * Screens read the offering by position — `plan(0).price` — because the
 * published artifact is a description, not code: the compiler turns that
 * expression into a binding the device resolves against whatever offering is
 * live. The three device-SDK calls this type used to expose instead
 * (`getSnapshot`, `subscribe`, `reload`) could never be compiled, so a screen
 * written against them type-checked, ran in the canvas, and then failed to
 * publish.
 *
 * The two were reconciled in the prompt first, which was worse than either:
 * the agent wrote `plan(0)`, TypeScript refused it, and one run spent twenty
 * rounds inventing a type augmentation for its own runtime and then deleting
 * it again.
 */
export type BuilderV2RuntimeBilling = {
  /** One plan by position in the offering. */
  plan(index: number): BuilderV2RuntimeBillingPlan;
  /** Whether the offering actually contains that plan. */
  hasPlan(index: number): boolean;
  /** Every plan the offering contains, in order. */
  readonly plans: readonly BuilderV2RuntimeBillingPlan[];
  /**
   * Buy a plan the screen selected. The only call that charges.
   *
   * Four forms, because four are what the artifact compiler reads and what the
   * device resolves: a plan, its position, a product id, and the value held in
   * screen state — which is a string, and is null until someone chooses. That
   * last one is the ordinary multi-plan paywall, and it did not typecheck: a
   * screen written exactly as the runtime API describes it — "buy the plan the
   * screen selected" — was refused by this signature while the compiler
   * accepted it happily. `null` resolves to no purchase, which is what a CTA
   * pressed with nothing selected already meant.
   */
  purchase(
    plan: BuilderV2RuntimeBillingPlan | number | string | null,
  ): Promise<BuilderV2RuntimePurchaseResult>;
  restore(): Promise<BuilderV2RuntimeRestoreResult>;
};

export type BuilderV2RuntimePermissionStatus =
  | "undetermined"
  | "granted"
  | "denied";

export type BuilderV2RuntimeCameraResult =
  | {
      readonly status: "captured";
      readonly uri: string;
      readonly width?: number;
      readonly height?: number;
    }
  | {
      readonly status: "cancelled";
    }
  | {
      readonly status: "unavailable";
      readonly message: string;
    };

export type BuilderV2RuntimeCamera = {
  getPermissionStatus(): Promise<BuilderV2RuntimePermissionStatus>;
  requestPermission(): Promise<BuilderV2RuntimePermissionStatus>;
  capture(input?: {
    readonly quality?: number;
    readonly allowsEditing?: boolean;
  }): Promise<BuilderV2RuntimeCameraResult>;
};

export type BuilderV2RuntimeNotificationPermissionResult = {
  readonly status: BuilderV2RuntimePermissionStatus;
  readonly canAskAgain: boolean;
};

export type BuilderV2RuntimeNotificationScheduleResult =
  | {
      readonly status: "scheduled";
      readonly notificationId: string;
    }
  | {
      readonly status: "unavailable";
      readonly message: string;
    };

export type BuilderV2RuntimeNotifications = {
  getPermissionStatus(): Promise<BuilderV2RuntimeNotificationPermissionResult>;
  requestPermission(): Promise<BuilderV2RuntimeNotificationPermissionResult>;
  schedule(input: {
    readonly title: string;
    readonly body: string;
    readonly delaySeconds?: number;
    readonly data?: Readonly<Record<string, string | number | boolean>>;
  }): Promise<BuilderV2RuntimeNotificationScheduleResult>;
};

export type BuilderV2RuntimeHapticStyle =
  | "selection"
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error";

export type BuilderV2RuntimeHaptics = {
  trigger(style: BuilderV2RuntimeHapticStyle): Promise<void>;
};

/**
 * A handoff, not an implementation.
 *
 * Sign-in belongs to the host app — its accounts, its screens, its providers.
 * A flow's "Already have an account? Sign in" hands the person over and is
 * done; the artifact never renders credential fields, and the SDK never
 * learns what authentication means in this app. The host decides what
 * happens: open its login screen, dismiss the flow, both.
 */
export type BuilderV2RuntimeAuth = {
  signIn(): Promise<void>;
  signUp(): Promise<void>;
};

export type BuilderV2RuntimeStoreReviewResult =
  | {
      readonly status: "requested";
    }
  | {
      readonly status: "unavailable";
      readonly message: string;
    };

export type BuilderV2RuntimeStoreReview = {
  isAvailable(): Promise<boolean>;
  request(): Promise<BuilderV2RuntimeStoreReviewResult>;
};

export type BuilderV2RuntimeCapabilities = {
  readonly version: typeof BUILDER_V2_RUNTIME_CAPABILITIES_VERSION;
  readonly navigation: BuilderV2RuntimeNavigation;
  readonly interactions: BuilderV2RuntimeInteractions;
  readonly localization?: BuilderV2RuntimeLocalization;
  /**
   * Always present. A flow that sells nothing simply never reads it, and a
   * paywall that had to check for it was a paywall that could not be written:
   * the optional form pushed screens into `billing?.hasPlan(0)`, which the
   * artifact compiler rejects, and into asking the user for a billing contract
   * that is ours.
   */
  readonly billing: BuilderV2RuntimeBilling;
  readonly links: BuilderV2RuntimeLinks;
  readonly auth?: BuilderV2RuntimeAuth;
  readonly camera?: BuilderV2RuntimeCamera;
  readonly haptics?: BuilderV2RuntimeHaptics;
  readonly notifications?: BuilderV2RuntimeNotifications;
  readonly storeReview?: BuilderV2RuntimeStoreReview;
  /**
   * The app's own handlers, by the names the project manifest declares:
   * `await runtime.actions.saveProfile({ goal })`. Each resolves when the app
   * has answered; a button that awaits one before navigating stays busy until
   * then. Present only when the app lent `actions={{ … }}`.
   */
  readonly actions?: BuilderV2RuntimeActions;
};

export type BuilderV2RuntimeActions = {
  readonly [name: string]: (input?: BuilderV2UiIrJsonValue) => Promise<void>;
};

export type BuilderV2RuntimeJourneyState = {
  readonly activeScreenId: string;
  /**
   * The step this screen stands at, from 0, as a progress bar counts steps:
   * the screens an answer chooses between share one step, because a person
   * walks exactly one of them. See builderV2JourneySteps.
   */
  readonly position: number;
  /** How many steps the walk has, counted the same way. */
  readonly total: number;
  readonly surface: BuilderV2ProjectSurface;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  /**
   * What earlier screens collected, by state name — `journey.answers.name`
   * is the name typed two screens ago. In a screen's source it reads as a
   * string; the compiler turns it into a `{{name}}` placeholder the runtime
   * fills, so the artifact stays static. Empty for anything not answered.
   */
  readonly answers: Readonly<Record<string, string>>;
};

export type BuilderV2RemoteFlowProps = {
  runtime: BuilderV2RuntimeCapabilities;
  journey: BuilderV2RuntimeJourneyState;
};
