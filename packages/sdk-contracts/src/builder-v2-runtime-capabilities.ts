import type { BuilderV2ProjectSurface } from "./builder-v2-project";

export const BUILDER_V2_RUNTIME_CAPABILITIES_VERSION = 1 as const;

export type BuilderV2RuntimeNavigation = {
  continue(): void;
  back(): void;
  complete(): void;
  dismiss(): void;
};

export type BuilderV2RuntimeInteractions = {
  trigger(interactionId: string): void;
  wrap<TThis, TArgs extends unknown[], TResult>(
    interactionId: string,
    handler: (this: TThis, ...args: TArgs) => TResult,
  ): (this: TThis, ...args: TArgs) => TResult;
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

export type BuilderV2RuntimeBilling = {
  getSnapshot(): BuilderV2RuntimeBillingSnapshot;
  subscribe(listener: () => void): () => void;
  reload(): Promise<void>;
  purchase(packageId: string): Promise<BuilderV2RuntimePurchaseResult>;
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
  readonly billing?: BuilderV2RuntimeBilling;
  readonly camera?: BuilderV2RuntimeCamera;
  readonly haptics?: BuilderV2RuntimeHaptics;
  readonly notifications?: BuilderV2RuntimeNotifications;
  readonly storeReview?: BuilderV2RuntimeStoreReview;
};

export type BuilderV2RuntimeJourneyState = {
  readonly activeScreenId: string;
  readonly position: number;
  readonly total: number;
  readonly surface: BuilderV2ProjectSurface;
  readonly isFirst: boolean;
  readonly isLast: boolean;
};

export type BuilderV2RemoteFlowProps = {
  runtime: BuilderV2RuntimeCapabilities;
  journey: BuilderV2RuntimeJourneyState;
};
