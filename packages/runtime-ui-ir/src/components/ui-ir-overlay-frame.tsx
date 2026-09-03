import type { ReactElement, ReactNode } from "react";

/**
 * The box a sheet fills. A device's modal covers the whole app on its own,
 * so nothing is needed here; the web variant marks the journey's root as the
 * containing block its fixed sheets measure against.
 */
export function UiIrOverlayFrame(props: { children: ReactNode }): ReactElement {
  return <>{props.children}</>;
}
