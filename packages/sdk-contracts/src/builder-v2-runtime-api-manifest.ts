import {
  BUILDER_V2_RUNTIME_CAPABILITIES_VERSION,
  type BuilderV2RuntimeCapabilities,
  type BuilderV2RuntimeJourneyState,
} from "./builder-v2-runtime-capabilities";

type AnyFunction = (...args: never[]) => unknown;

type FunctionKeys<T> = {
  [Key in keyof T]-?: NonNullable<T[Key]> extends AnyFunction ? Key : never;
}[keyof T] &
  string;

type RuntimeGroupKeys = Exclude<keyof BuilderV2RuntimeCapabilities, "version">;

type RuntimeMethodDescription = {
  readonly signature: string;
  readonly description: string;
};

type RuntimeGroupDescription<T> = {
  readonly required: boolean;
  readonly methods: {
    readonly [Key in FunctionKeys<T>]: RuntimeMethodDescription;
  };
};

export type BuilderV2RuntimeApiManifest = {
  readonly version: typeof BUILDER_V2_RUNTIME_CAPABILITIES_VERSION;
  readonly groups: {
    readonly [Key in RuntimeGroupKeys]-?: RuntimeGroupDescription<
      NonNullable<BuilderV2RuntimeCapabilities[Key]>
    >;
  };
  readonly journey: {
    readonly [Key in keyof BuilderV2RuntimeJourneyState]-?: string;
  };
};

export const BUILDER_V2_RUNTIME_API_MANIFEST = {
  version: BUILDER_V2_RUNTIME_CAPABILITIES_VERSION,
  groups: {
    navigation: {
      required: true,
      methods: {
        continue: {
          signature: "runtime.navigation.continue(): void",
          description: "Move to the next onboarding screen.",
        },
        back: {
          signature: "runtime.navigation.back(): void",
          description: "Move to the previous onboarding screen.",
        },
        complete: {
          signature: "runtime.navigation.complete(): void",
          description: "Complete the onboarding journey.",
        },
        dismiss: {
          signature: "runtime.navigation.dismiss(): void",
          description: "Dismiss the current dismissible surface.",
        },
      },
    },
    interactions: {
      required: true,
      methods: {
        trigger: {
          signature:
            "runtime.interactions.trigger(interactionId: string): void",
          description:
            "Record a declared interaction without wrapping a handler.",
        },
        wrap: {
          signature:
            "runtime.interactions.wrap(interactionId: string, handler: Function): Function",
          description: "Wrap a handler with automatic interaction analytics.",
        },
      },
    },
    localization: {
      required: false,
      methods: {
        getLocale: {
          signature: "runtime.localization?.getLocale(): string",
          description: "Read the active locale.",
        },
        subscribe: {
          signature:
            "runtime.localization?.subscribe(listener: () => void): () => void",
          description:
            "Observe locale changes and return an unsubscribe function.",
        },
      },
    },
    billing: {
      required: false,
      methods: {
        getSnapshot: {
          signature:
            "runtime.billing?.getSnapshot(): BuilderV2RuntimeBillingSnapshot",
          description:
            "Read packages, selection, availability, and operation state.",
        },
        subscribe: {
          signature:
            "runtime.billing?.subscribe(listener: () => void): () => void",
          description:
            "Observe billing state and return an unsubscribe function.",
        },
        reload: {
          signature: "runtime.billing?.reload(): Promise<void>",
          description: "Reload the current offering and product state.",
        },
        purchase: {
          signature:
            "runtime.billing?.purchase(packageId: string): Promise<BuilderV2RuntimePurchaseResult>",
          description: "Purchase one package selected by its package ID.",
        },
        restore: {
          signature:
            "runtime.billing?.restore(): Promise<BuilderV2RuntimeRestoreResult>",
          description: "Restore purchases for the current app user.",
        },
      },
    },
    camera: {
      required: false,
      methods: {
        getPermissionStatus: {
          signature:
            "runtime.camera?.getPermissionStatus(): Promise<BuilderV2RuntimePermissionStatus>",
          description: "Read camera permission state.",
        },
        requestPermission: {
          signature:
            "runtime.camera?.requestPermission(): Promise<BuilderV2RuntimePermissionStatus>",
          description: "Request camera permission.",
        },
        capture: {
          signature:
            "runtime.camera?.capture(options?): Promise<BuilderV2RuntimeCameraResult>",
          description: "Open capture UI and return the selected camera result.",
        },
      },
    },
    haptics: {
      required: false,
      methods: {
        trigger: {
          signature:
            "runtime.haptics?.trigger(style: BuilderV2RuntimeHapticStyle): Promise<void>",
          description: "Trigger one supported haptic feedback style.",
        },
      },
    },
    notifications: {
      required: false,
      methods: {
        getPermissionStatus: {
          signature:
            "runtime.notifications?.getPermissionStatus(): Promise<BuilderV2RuntimeNotificationPermissionResult>",
          description: "Read notification permission state.",
        },
        requestPermission: {
          signature:
            "runtime.notifications?.requestPermission(): Promise<BuilderV2RuntimeNotificationPermissionResult>",
          description: "Request notification permission.",
        },
        schedule: {
          signature:
            "runtime.notifications?.schedule(input): Promise<BuilderV2RuntimeNotificationScheduleResult>",
          description:
            "Schedule a local notification using the declared input shape.",
        },
      },
    },
    storeReview: {
      required: false,
      methods: {
        isAvailable: {
          signature: "runtime.storeReview?.isAvailable(): Promise<boolean>",
          description: "Check whether native store review is available.",
        },
        request: {
          signature:
            "runtime.storeReview?.request(): Promise<BuilderV2RuntimeStoreReviewResult>",
          description: "Request the native store review flow.",
        },
      },
    },
  },
  journey: {
    activeScreenId: "ID of the screen currently mounted by the host runtime.",
    position: "Zero-based active screen position in the journey.",
    total: "Total number of screens in the active journey.",
    surface: "Surface of the active screen: onboarding or paywall.",
    isFirst: "Whether the active screen is the first journey screen.",
    isLast: "Whether the active screen is the last journey screen.",
  },
} as const satisfies BuilderV2RuntimeApiManifest;
