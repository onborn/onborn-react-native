import { useEffect, useRef, useState, type ReactElement } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

import type { UiIrModalSurfaceProps } from "./ui-ir-modal-surface";

/*
 * A sheet drawn inside the frame it belongs to.
 *
 * Rendered in place rather than through react-native-web's Modal: that one
 * portals to the document body and fixes itself to the browser viewport, so
 * on a desktop the funnel's sheet stretched across the whole page while the
 * flow ran in a phone-width column. Here the layer is `position: fixed`
 * inside the tree, and the journey's root carries a transform that makes it
 * the containing block (see UiIrOverlayFrame) — the sheet fills the frame,
 * covers the chrome, escapes any scroll view between, and keeps every React
 * context the screen provides.
 */
const SLIDE_MS = 300;

export function UiIrModalSurface(props: UiIrModalSurfaceProps): ReactElement {
  const { onRequestClose, open } = props;
  const [height, setHeight] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  // The platform modal's slide: the whole sheet, scrim included, rises from
  // the bottom edge and sinks back the same way.
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [open, progress]);
  // Escape closes, as the platform modal's back gesture does.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onRequestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onRequestClose]);
  return (
    <Animated.View
      {...props.common}
      // The same attribute react-native-web's Modal sets; the design review
      // renderer scopes its contrast sweep to it.
      {...({ "aria-modal": true, role: "dialog" } as Record<string, unknown>)}
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      pointerEvents={open ? "auto" : "none"}
      style={[
        styles.layer,
        {
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [height || 800, 0],
              }),
            },
          ],
        },
      ]}
    >
      {props.children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    // Fixed to the nearest transformed ancestor — the journey frame — not
    // the viewport. react-native-web passes the value through to CSS.
    position: "fixed" as "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
});
