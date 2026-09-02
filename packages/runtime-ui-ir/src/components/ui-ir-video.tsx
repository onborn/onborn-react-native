import type { ReactElement } from "react";
import type { ImageSourcePropType, StyleProp, ViewStyle } from "react-native";

import type { BuilderV2UiIrJsonValue } from "@onborn/sdk-contracts/builder-v2-ui-ir";

import { uiIrVideoUri } from "../domain/ui-ir-video-source";
import type { UiIrRendererPorts } from "../ports/ui-ir-renderer";

export type UiIrVideoProps = {
  /** A default import of a declared video asset, or a resolved `{ uri }`. */
  source: ImageSourcePropType | string;
  /** Loops by default; false plays once and holds the last frame. */
  loop?: boolean;
  /** Muted by default; sound needs a gesture the node never gets. */
  muted?: boolean;
  resizeMode?: "cover" | "contain";
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /**
   * Present when the renderer instantiates the node. Absent when a screen's
   * source imports <Video> itself — which only ever runs on the canvas, and
   * the canvas runs the web file beside this one.
   */
  host?: {
    ports: Pick<UiIrRendererPorts, "renderCapability">;
    screenId: string;
    nodeId: string;
  };
};

/**
 * A video on the device: the host's player, lent the way the Lottie player
 * is. The runtime resolves the file from the artifact and hands the player a
 * URI, so the host renders what it is given and never fetches anything.
 */
export function UiIrVideo(props: UiIrVideoProps): ReactElement | null {
  if (!props.host) return null;
  return (
    <>
      {props.host.ports.renderCapability({
        screenId: props.host.screenId,
        nodeId: props.host.nodeId,
        capability: "video",
        component: "VideoView",
        props: {
          uri: uiIrVideoUri(props.source),
          loop: props.loop !== false,
          muted: props.muted !== false,
          resizeMode: props.resizeMode ?? "cover",
          ...(props.style ? { style: props.style as BuilderV2UiIrJsonValue } : {}),
          ...(props.accessibilityLabel
            ? { accessibilityLabel: props.accessibilityLabel }
            : {}),
        },
      })}
    </>
  );
}
