import type { ReactNode } from "react";
import type { ExpoUiIrCapabilityPort } from "@onborn/runtime-expo-ui-ir";
import type {
  BuilderV2RuntimeAuth,
  BuilderV2RuntimeCamera,
  BuilderV2RuntimeHaptics,
  BuilderV2RuntimeHapticStyle,
  BuilderV2RuntimeNotifications,
  BuilderV2UiIrJsonValue,
} from "@onborn/sdk-contracts";

import type { BuilderV2HostCapability } from "./runtime-manifest";
import {
  readLottieRenderProps,
  type BuilderV2RuntimeLottie,
  type BuilderV2RuntimeLottieView,
  type OnbornLottieRenderProps,
} from "./lottie-capability";
import {
  readVideoRenderProps,
  type BuilderV2RuntimeVideo,
  type OnbornVideoRenderProps,
} from "./video-capability";

/**
 * The native capabilities an app lends to a published flow.
 *
 * Lending rather than bundling, deliberately. Each of these needs a native
 * module, a config plugin and platform permission strings, and shipping them
 * inside the SDK would charge every app for all of them — a flow that never
 * mentions the camera would still make its host ask for camera access at
 * install. An app pays for what it uses.
 *
 * The consequence is that the host manifest promises a capability only when
 * one arrived here. That is the rule the dialect got wrong for a long time:
 * `runtime.notifications.requestPermission` compiled, the capability enum
 * listed it, the manifest never declared it, and the first flow to ask would
 * have been judged incompatible with the device quietly serving the previous
 * release.
 */
export type OnbornHostCapabilities = {
  /**
   * The app's own sign-in and account creation, as two callbacks.
   *
   * A flow's "Already have an account? Sign in" is a handoff: the artifact
   * renders the button, the app decides what happens — open its login
   * screen, dismiss the flow, both. No credential ever crosses the artifact.
   */
  auth?: BuilderV2RuntimeAuth;
  notifications?: BuilderV2RuntimeNotifications;
  camera?: BuilderV2RuntimeCamera;
  haptics?: BuilderV2RuntimeHaptics;
  /**
   * The Lottie player, for flows whose screens animate.
   *
   * `import LottieView from "lottie-react-native"` and lend it here. The
   * animations themselves travel inside the artifact; only the native player
   * is the app's to provide, for the same reason the camera is.
   */
  lottie?: BuilderV2RuntimeLottie;
  /**
   * The video player, for flows whose screens play a clip.
   *
   * `import { VideoView, useVideoPlayer } from "expo-video"` and lend both
   * here. The clips travel inside the artifact like images; only the native
   * player is the app's to provide, for the same reason the Lottie player is.
   */
  video?: BuilderV2RuntimeVideo;
  /**
   * The app's own handlers, by the names the flow's manifest declares.
   *
   * A screen calls `await runtime.actions.saveProfile({ goal })`; this is
   * what answers. The handler gets the input the screen wrote and the
   * journey's answers so far, and the button that made the call stays busy
   * until the promise settles — a rejection leaves the person on the screen,
   * with the app's own error handling (a toast, a retry) in charge.
   */
  actions?: Readonly<Record<string, OnbornHostAction>>;
};

export type OnbornHostActionContext = {
  screenId: string;
  nodeId: string;
  /** Everything the journey has collected so far, by state name. */
  answers: Readonly<Record<string, string>>;
};

export type OnbornHostAction = (
  input: BuilderV2UiIrJsonValue | undefined,
  context: OnbornHostActionContext,
) => Promise<void> | void;

/**
 * One table rather than a branch per capability.
 *
 * Adding the next one is a row here, so it cannot arrive with its own private
 * notion of what "declared" or "invocable" means — which is precisely the gap
 * that left notifications compiled, enumerated and unpromised.
 */
const CAPABILITY_METHODS: {
  [K in keyof OnbornHostCapabilities]-?: (
    implementation: NonNullable<OnbornHostCapabilities[K]>,
    method: string,
    input: BuilderV2UiIrJsonValue | undefined,
    context: OnbornHostActionContext,
  ) => Promise<unknown> | undefined;
} = {
  // The method IS the handler's name; the app named it in the manifest.
  actions: (actions, method, input, context) => {
    const handler = Object.prototype.hasOwnProperty.call(actions, method)
      ? actions[method]
      : undefined;
    return handler ? Promise.resolve(handler(input, context)) : undefined;
  },
  notifications: (notifications, method, input) => {
    if (method === "requestPermission")
      return notifications.requestPermission();
    if (method === "getPermissionStatus") {
      return notifications.getPermissionStatus();
    }
    if (method === "schedule") {
      return notifications.schedule(readNotificationSchedule(input));
    }
    return undefined;
  },
  auth: (auth, method) => {
    if (method === "signIn") return auth.signIn();
    if (method === "signUp") return auth.signUp();
    return undefined;
  },
  camera: (camera, method) => {
    if (method === "requestPermission") return camera.requestPermission();
    if (method === "getPermissionStatus") return camera.getPermissionStatus();
    if (method === "capture") return camera.capture();
    return undefined;
  },
  haptics: (haptics, method, input) => {
    if (method !== "trigger") return undefined;
    return haptics.trigger(readHapticStyle(input));
  },
  // Components, not methods: rendered below, never invoked.
  lottie: () => undefined,
  video: () => undefined,
};

/**
 * The app's own capabilities over the SDK's built-in ones, the way React
 * merges props: an app that lends its own haptics keeps them, one that lends
 * nothing still has the SDK's. See built-in-capabilities.ts.
 */
export function mergeHostCapabilities(
  builtIn: OnbornHostCapabilities,
  lent: OnbornHostCapabilities | undefined,
): OnbornHostCapabilities {
  return { ...builtIn, ...(lent ?? {}) };
}

export function hostCapabilityNames(
  capabilities: OnbornHostCapabilities | undefined,
): BuilderV2HostCapability[] {
  return (Object.keys(CAPABILITY_METHODS) as BuilderV2HostCapability[]).filter(
    (name) => Boolean(capabilities?.[name as keyof OnbornHostCapabilities]),
  );
}

/**
 * Every capability a host COULD lend — for surfaces that only need the
 * compatibility gate to pass, never an implementation. The prefetcher claims
 * them all so a flow requiring, say, haptics still warms the cache; the real
 * mount re-checks against what the app actually lent.
 */
export function allHostCapabilityNames(): BuilderV2HostCapability[] {
  return Object.keys(CAPABILITY_METHODS) as BuilderV2HostCapability[];
}

/**
 * Turns the app's capability objects into the port the runtime invokes.
 *
 * Returns nothing when the app lent nothing, so the session is given no port
 * at all rather than one that rejects every call — an artifact could not have
 * required a capability the manifest never promised.
 */
/**
 * How a lent Lottie player is drawn.
 *
 * Supplied by the presentation rather than imported here, so this module
 * stays free of react-native: the component reads the device's reduce-motion
 * setting, and that import has no business in the code that decides what a
 * host promised.
 */
export type OnbornCapabilityRenderers = {
  lottie: (
    props: OnbornLottieRenderProps & { LottieView: BuilderV2RuntimeLottieView },
  ) => ReactNode;
  video: (
    props: OnbornVideoRenderProps & { video: BuilderV2RuntimeVideo },
  ) => ReactNode;
};

export function createOnbornCapabilityPort(
  capabilities: OnbornHostCapabilities | undefined,
  renderers: OnbornCapabilityRenderers,
): ExpoUiIrCapabilityPort | undefined {
  if (hostCapabilityNames(capabilities).length === 0) return undefined;
  return {
    async invoke(invocation) {
      const name = invocation.capability as keyof OnbornHostCapabilities;
      const implementation = capabilities?.[name];
      const route = CAPABILITY_METHODS[name];
      if (!implementation || !route) {
        throw new Error(
          `This app did not provide the "${invocation.capability}" capability.`,
        );
      }
      const result = route(
        implementation as never,
        invocation.method,
        invocation.input,
        {
          screenId: invocation.screenId,
          nodeId: invocation.nodeId,
          answers: invocation.answers ?? {},
        },
      );
      if (result === undefined) {
        // Silence here would read as a permission granted or a haptic fired,
        // neither of which happened.
        throw new Error(
          `Unsupported ${invocation.capability} method "${invocation.method}".`,
        );
      }
      await result;
    },
    render(input) {
      if (input.capability === "lottie") {
        const lottie = capabilities?.lottie;
        if (!lottie) {
          throw new Error(
            'This app did not lend a Lottie player. Pass capabilities={{ lottie: { LottieView } }} with LottieView from "lottie-react-native".',
          );
        }
        return renderers.lottie({
          ...readLottieRenderProps(input.props),
          LottieView: lottie.LottieView,
        });
      }
      if (input.capability === "video") {
        const video = capabilities?.video;
        if (!video) {
          throw new Error(
            'This app did not lend a video player. Pass capabilities={{ video: { VideoView, useVideoPlayer } }} with both from "expo-video".',
          );
        }
        return renderers.video({
          ...readVideoRenderProps(input.props),
          video,
        });
      }
      /*
       * The rest are actions, not components. A capability node asking to be
       * drawn is a separate feature, and answering it with an empty view would
       * leave a silent hole in the screen.
       */
      throw new Error("This app provides no rendered capability components.");
    },
  };
}

function readNotificationSchedule(input: BuilderV2UiIrJsonValue | undefined): {
  title: string;
  body: string;
  delaySeconds?: number;
} {
  const value = (input ?? {}) as Record<string, unknown>;
  const delaySeconds =
    typeof value.delaySeconds === "number" ? value.delaySeconds : undefined;
  return {
    title: typeof value.title === "string" ? value.title : "",
    body: typeof value.body === "string" ? value.body : "",
    ...(delaySeconds === undefined ? {} : { delaySeconds }),
  };
}

function readHapticStyle(
  input: BuilderV2UiIrJsonValue | undefined,
): BuilderV2RuntimeHapticStyle {
  // Every style the contract defines. A short list here silently served
  // "light" for the three the host was typed to handle.
  const styles: BuilderV2RuntimeHapticStyle[] = [
    "selection",
    "light",
    "medium",
    "heavy",
    "success",
    "warning",
    "error",
  ];
  return styles.find((style) => style === input) ?? "light";
}
