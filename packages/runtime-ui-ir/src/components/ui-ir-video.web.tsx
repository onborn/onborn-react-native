import { createElement, type ReactElement } from "react";
import { StyleSheet, View } from "react-native";

import { uiIrVideoUri } from "../domain/ui-ir-video-source";
import type { UiIrVideoProps } from "./ui-ir-video";

export type { UiIrVideoProps } from "./ui-ir-video";

/**
 * A video on the web: the browser's own <video>, muted and autoplaying,
 * which is the only video a browser starts without a gesture. The same
 * component draws the canvas (where a screen's source imports it) and the
 * funnel (where the renderer instantiates the node), so what the builder
 * shows is what the funnel plays.
 */
export function UiIrVideo(props: UiIrVideoProps): ReactElement {
  return (
    <View
      accessibilityLabel={props.accessibilityLabel}
      style={[styles.box, props.style]}
    >
      {createElement("video", {
        src: uiIrVideoUri(props.source),
        autoPlay: true,
        muted: props.muted !== false,
        loop: props.loop !== false,
        playsInline: true,
        controls: false,
        disablePictureInPicture: true,
        style: {
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: props.resizeMode ?? "cover",
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: "hidden",
  },
});
