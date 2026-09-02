/**
 * The web funnel's reading of every UI IR node type.
 *
 * The artifact is one document with two consumers: the React Native SDK and
 * the web funnel host (react-native-web). This map is the second consumer's
 * standing in the contract — the ratchet that makes a dialect change weigh
 * the web target: adding a node type without declaring how the funnel treats
 * it fails the contract test beside this file, at the moment of the change
 * rather than in a funnel bug report months later.
 *
 * Dispositions:
 * - "renders": the same component renders through react-native-web.
 * - "degrades": the runtime substitutes deliberately reduced behaviour on
 *   web and the publish-time web lint may warn about it.
 * - "hidden": the node does not render on web; a screen that depends on it
 *   should be surface-flagged app-only, which the web lint enforces.
 */
export type BuilderV2UiIrWebDisposition = "renders" | "degrades" | "hidden";

export const BUILDER_V2_UI_IR_WEB_DISPOSITIONS: Readonly<
  Record<string, BuilderV2UiIrWebDisposition>
> = {
  view: "renders",
  "safe-area-view": "renders",
  "scroll-view": "renders",
  text: "renders",
  image: "renders",
  "image-background": "renders",
  // Drawn with react-native-svg, which renders through react-native-web.
  "linear-gradient": "renders",
  // react-native-web's TextInput is an <input>/<textarea>.
  "text-input": "renders",
  "journey-progress": "renders",
  // Drawn with react-native-svg and a JS-driven fill, like the chart.
  "progress-ring": "renders",
  // A <video> element, muted and autoplaying, which every browser starts.
  video: "renders",
  "screen-slot": "renders",
  pressable: "renders",
  "phosphor-icon": "renders",
  svg: "renders",
  "svg-group": "renders",
  "svg-path": "renders",
  "svg-circle": "renders",
  chart: "renders",
  carousel: "renders",
  "segmented-control": "renders",
  modal: "renders",
  "billing-plans": "renders",
  lottie: "renders",
  /*
   * A native status bar does not exist in a browser; the browser owns its
   * own chrome. Dropped silently — never a reason to flag a screen app-only.
   */
  "status-bar": "hidden",
  /*
   * Host-lent native modules: camera, haptics, notifications, store review.
   * The web host decides per capability — some have web equivalents
   * (notifications), most do not — so the node renders whatever the web
   * host's capability port answers, and the publish-time web lint warns
   * where a web-flagged screen depends on one.
   */
  capability: "degrades",
};
