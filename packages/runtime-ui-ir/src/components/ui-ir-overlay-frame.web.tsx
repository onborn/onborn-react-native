import type { ReactElement, ReactNode } from "react";
import { StyleSheet, View } from "react-native";

/*
 * An identity transform is enough: CSS makes any transformed element the
 * containing block of its `position: fixed` descendants, so a sheet drawn by
 * UiIrModalSurface fills this frame — the phone-width column on a desktop
 * funnel — instead of the browser viewport.
 */
export function UiIrOverlayFrame(props: { children: ReactNode }): ReactElement {
  return <View style={styles.frame}>{props.children}</View>;
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    transform: [{ translateX: 0 }],
  },
});
