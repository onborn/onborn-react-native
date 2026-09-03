import type { BuilderV2RuntimeHapticStyle } from "@onborn/sdk-contracts/builder-v2-runtime-capabilities";
import * as Haptics from "expo-haptics";
import { VideoView, useVideoPlayer } from "expo-video";

import type { OnbornHostCapabilities } from "./host-capabilities";
import type { BuilderV2RuntimeLottie } from "./lottie-capability";
import type { BuilderV2RuntimeVideo } from "./video-capability";

/*
 * What every app with the SDK can do without lending anything.
 *
 * A flow published with a clip, or a ruler that taps as it scrolls, used to
 * need the app to lend expo-video or expo-haptics through the capabilities
 * prop — and an app already in the stores could not take the new flow until
 * its next release, which is the release the builder exists to spare it. The
 * cheap capabilities ship with the SDK instead: expo-video and expo-haptics
 * are its own dependencies, need no permission string and no config plugin,
 * and are declared to the server from the first build that carries the SDK.
 * Lottie stays optional — its native player is heavy — and is picked up when
 * the app has it installed. Whatever the app lends explicitly wins.
 */
export function builtInHostCapabilities(): OnbornHostCapabilities {
  const lottie = optionalLottie();
  return {
    haptics: { trigger: triggerExpoHaptic },
    video: expoVideo,
    ...(lottie ? { lottie } : {}),
  };
}

const expoVideo: BuilderV2RuntimeVideo = {
  VideoView: VideoView as unknown as BuilderV2RuntimeVideo["VideoView"],
  useVideoPlayer:
    useVideoPlayer as unknown as BuilderV2RuntimeVideo["useVideoPlayer"],
};

async function triggerExpoHaptic(
  style: BuilderV2RuntimeHapticStyle,
): Promise<void> {
  switch (style) {
    case "selection":
      await Haptics.selectionAsync();
      return;
    case "success":
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    case "warning":
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    case "error":
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    case "heavy":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return;
    case "medium":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    default:
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

declare const require: ((id: string) => unknown) | undefined;

/*
 * lottie-react-native when the app installed it. A require inside try/catch
 * is Metro's optional dependency: an app without the package bundles fine
 * and simply lends no player, and a flow that animates is judged
 * incompatible with it — the same answer as before, reached without a prop.
 */
function optionalLottie(): BuilderV2RuntimeLottie | null {
  if (typeof require !== "function") return null;
  try {
    const module = require("lottie-react-native") as
      | { default?: BuilderV2RuntimeLottie["LottieView"] }
      | BuilderV2RuntimeLottie["LottieView"]
      | undefined;
    const LottieView =
      module && typeof module === "object" && "default" in module
        ? module.default
        : (module as BuilderV2RuntimeLottie["LottieView"] | undefined);
    return LottieView ? { LottieView } : null;
  } catch {
    return null;
  }
}
