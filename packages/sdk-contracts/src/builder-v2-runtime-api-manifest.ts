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
        /*
         * Removed rather than described: a handler is one call in the dialect,
         * and a wrapped one cannot be published — the compiler answers
         * `runtime.interactions.wrap is not a supported semantic host action`.
         * Offering it here invited screens to write exactly that, which is the
         * shape this audit was looking for: a documented call that no screen
         * can ship. `trigger` records the same event and does compile.
         */
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
    /**
     * Always available, and read by binding rather than by call.
     *
     * Listed as optional it read as a native capability a project had to
     * declare, and a run asked to build a paywall for a project that declared
     * none concluded the runtime had no billing and asked the user for "the
     * callback names and product identifiers" — for an API that is ours.
     */
    billing: {
      required: true,
      methods: {
        plan: {
          signature:
            "runtime.billing.plan(index: number): { id; title; description; badge; price; period; trial }",
          description:
            "One plan of the loaded offering by position. Read its fields into text; never write a price, a period or a plan name as copy.",
        },
        hasPlan: {
          signature: "runtime.billing.hasPlan(index: number): boolean",
          description:
            "Whether the offering contains that plan. Wrap a plan block in it so a layout built for two survives an offering that sells one.",
        },
        purchase: {
          signature:
            "runtime.billing.purchase(plan): Promise<BuilderV2RuntimePurchaseResult>",
          description:
            "Buy the plan the screen selected, by plan or by its position. The only action that charges.",
        },
        restore: {
          signature:
            "runtime.billing.restore(): Promise<BuilderV2RuntimeRestoreResult>",
          description:
            "Restore purchases for the current app user. Required on every paywall by App Review.",
        },
      },
    },
    links: {
      required: true,
      methods: {
        openTerms: {
          signature: "runtime.links.openTerms(): Promise<void>",
          description:
            "Open the project's Terms of Service. Required on every paywall by App Review, alongside the privacy policy.",
        },
        openPrivacy: {
          signature: "runtime.links.openPrivacy(): Promise<void>",
          description:
            "Open the project's Privacy Policy. The URLs belong to the release, so a screen names the document and never writes a link.",
        },
      },
    },
    auth: {
      required: false,
      methods: {
        signIn: {
          signature: "runtime.auth?.signIn(): Promise<void>",
          description:
            "Hand the person to the host app's own sign-in. The flow renders one button; the app decides what signing in means.",
        },
        signUp: {
          signature: "runtime.auth?.signUp(): Promise<void>",
          description: "Hand the person to the host app's own account creation.",
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
    actions: {
      required: false,
      // Named by each project's manifest, not by the platform.
      methods: {},
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
    answers:
      "What earlier screens collected, by state name; journey.answers.name compiles to a {{name}} placeholder the runtime fills.",
  },
} as const satisfies BuilderV2RuntimeApiManifest;
