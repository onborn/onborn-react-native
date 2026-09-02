import { useContext, type ReactElement } from "react";
import { View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import {
  BuilderV2UiIrDocumentSchema,
  type BuilderV2UiIrDocument,
  type BuilderV2UiIrEnterTransition,
} from "@onborn/sdk-contracts/builder-v2-ui-ir";

import type { UiIrAnswerStore } from "../domain/ui-ir-answers";
import { findUiIrScreen } from "../domain/ui-ir-document";
import { uiIrScreenWantsInsets } from "../domain/ui-ir-screen-insets";
import {
  EMPTY_UI_IR_PLAN_SNAPSHOT,
  type UiIrPlanSnapshot,
} from "../domain/ui-ir-plans";
import type { UiIrRendererPorts } from "../ports/ui-ir-renderer";
import { UiIrAnimatedView } from "./ui-ir-animated-view";
import { UiIrNode } from "./ui-ir-node";
import { UiIrPlansProvider } from "./ui-ir-plans-context";
import { UiIrScreenStateProvider } from "./ui-ir-screen-state";

export type UiIrScreenProps = {
  document: BuilderV2UiIrDocument;
  screenId?: string;
  locale?: string;
  ports: UiIrRendererPorts;
  /**
   * The offering this screen's price bindings read. Absent on a screen that
   * asks for no money, and while the store is still loading — in which case
   * every binding renders empty rather than a number nobody has confirmed.
   */
  plans?: UiIrPlanSnapshot;
  /** Where this screen publishes its selections for analytics to report. */
  answers?: UiIrAnswerStore;
  /**
   * The entrance this screen plays, resolved by the journey from the
   * document and the direction of travel; null (the default) mounts it in
   * place, which is what the first screen and a standalone render want.
   */
  transition?: BuilderV2UiIrEnterTransition | null;
  /**
   * Whether this screen pads the device's unsafe bands itself. "none" when
   * something around it — the journey's chrome — already did.
   */
  insets?: "auto" | "none";
};

const FLEX_FILL = { flex: 1 } as const;

/*
 * Validated once per document object, not once per render: the schema parse
 * of a whole journey document is real work, and this component runs it on
 * every screen change and state update. The document is immutable for the
 * life of a session, so the first parse answers for all of them.
 */
const parsedDocuments = new WeakMap<object, BuilderV2UiIrDocument>();

function parseDocumentOnce(input: BuilderV2UiIrDocument): BuilderV2UiIrDocument {
  const cached = parsedDocuments.get(input);
  if (cached) return cached;
  const parsed = BuilderV2UiIrDocumentSchema.parse(input);
  parsedDocuments.set(input, parsed);
  return parsed;
}

export function UiIrScreen(props: UiIrScreenProps): ReactElement {
  const document = parseDocumentOnce(props.document);
  const screenId = props.screenId ?? document.entryScreenId;
  const screen = findUiIrScreen(document, screenId);
  /*
   * Screens are authored on a notchless canvas; on a device, a plain content
   * screen gets the unsafe bands padded around it (see uiIrScreenWantsInsets
   * for which screens are left edge-to-edge). Without a SafeAreaProvider in
   * the tree — the web funnel, tests — the context is null and nothing pads.
   */
  const insets = useContext(SafeAreaInsetsContext);
  const wantsInsets =
    props.insets !== "none" &&
    insets !== null &&
    (insets.top > 0 || insets.bottom > 0) &&
    uiIrScreenWantsInsets(screen.root);
  const assets = new Map(
    document.assets.map((asset) => [asset.assetId, asset]),
  );
  const tree = (
    // Keyed by screen, so navigating resets selections instead of leaking one
    // screen's answer into the next.
    <UiIrScreenStateProvider
      key={screen.screenId}
      screen={screen}
      answers={props.answers}
    >
      <UiIrPlansProvider snapshot={props.plans ?? EMPTY_UI_IR_PLAN_SNAPSHOT}>
        <UiIrNode
          assets={assets}
          document={document}
          locale={props.locale}
          node={screen.root}
          ports={props.ports}
          screenId={screen.screenId}
        />
      </UiIrPlansProvider>
    </UiIrScreenStateProvider>
  );
  /*
   * The new screen plays its entrance; the one it replaces is simply gone.
   * An exit animation looked right on paper and flashed black on the device:
   * while the old screen faded out and the new one faded in, both were
   * half-transparent over the host's background. Not when the screen's root
   * brings its own entrance, which would otherwise play twice.
   */
  const entrance =
    props.transition &&
    !("enterTransition" in screen.root && screen.root.enterTransition)
      ? props.transition
      : null;
  const rendered = entrance ? (
    <UiIrAnimatedView
      key={screen.screenId}
      kind="view"
      style={FLEX_FILL}
      enterTransition={entrance}
    >
      {tree}
    </UiIrAnimatedView>
  ) : (
    tree
  );
  if (!wantsInsets) {
    return rendered;
  }
  const rootBackground =
    screen.root.style && typeof screen.root.style === "object"
      ? (screen.root.style as { backgroundColor?: unknown }).backgroundColor
      : undefined;
  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        // The inset bands wear the screen's own background, so the padding
        // reads as the screen extending under the status bar, not as a frame.
        ...(typeof rootBackground === "string"
          ? { backgroundColor: rootBackground }
          : {}),
      }}
    >
      {rendered}
    </View>
  );
}
