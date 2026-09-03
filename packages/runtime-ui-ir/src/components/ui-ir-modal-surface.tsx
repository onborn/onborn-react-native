import type { ReactElement, ReactNode } from "react";
import { Modal } from "react-native";

export type UiIrModalSurfaceProps = {
  /** The node's common props: markers, test ids, accessibility. */
  common: Record<string, unknown>;
  /** False while the sheet plays its exit; the surface slides away. */
  open: boolean;
  onRequestClose: () => void;
  children: ReactNode;
};

/**
 * What a sheet is drawn on. On a device it is the platform's modal, which
 * slides up over everything the app shows and slides back down when `open`
 * drops — the node stays mounted for that long (see UiIrModalPresence). The
 * web draws its own (see the .web variant): react-native-web's Modal portals
 * to the document body and fixes itself to the browser viewport, which on a
 * wide screen is the whole page and not the phone-width column the funnel
 * runs in.
 */
export function UiIrModalSurface(props: UiIrModalSurfaceProps): ReactElement {
  return (
    <Modal
      {...props.common}
      animationType="slide"
      onRequestClose={props.onRequestClose}
      transparent
      visible={props.open}
    >
      {props.children}
    </Modal>
  );
}
