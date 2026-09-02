import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import type { BuilderV2UiIrDocument } from "@onborn/sdk-contracts";

import { createUiIrActionHandler } from "../application/create-ui-ir-action-handler";
import { findUiIrScreen } from "../domain/ui-ir-document";
import {
  uiIrScreenEnterTransition,
  type UiIrJourneyDirection,
} from "../domain/ui-ir-screen-transition";
import { EMPTY_UI_IR_PLAN_SNAPSHOT } from "../domain/ui-ir-plans";
import { uiIrScreenWantsInsets } from "../domain/ui-ir-screen-insets";
import { UiIrNode } from "./ui-ir-node";
import { UiIrPlansProvider } from "./ui-ir-plans-context";
import { UiIrScreenStateProvider } from "./ui-ir-screen-state";
import type {
  UiIrJourneyController,
  UiIrJourneyState,
} from "../domain/ui-ir-journey";
import type { UiIrActionRuntimePorts } from "../ports/ui-ir-action-runtime";
import type { UiIrRendererPorts } from "../ports/ui-ir-renderer";
import type { UiIrPlanSnapshot } from "../domain/ui-ir-plans";
import type { UiIrAnswerStore } from "../domain/ui-ir-answers";
import { UiIrJourneyProvider } from "./ui-ir-journey-progress-context";
import { UiIrScreen } from "./ui-ir-screen";

export type UiIrJourneyProps = {
  document: BuilderV2UiIrDocument;
  locale?: string;
  controller: UiIrJourneyController;
  actionPorts: Omit<UiIrActionRuntimePorts, "journey">;
  rendererPorts: Omit<UiIrRendererPorts, "handleAction">;
  /** The offering a paywall screen's price bindings read. */
  plans?: UiIrPlanSnapshot;
  /** Where each screen publishes its selections for analytics to report. */
  answers?: UiIrAnswerStore;
};

export function UiIrJourney(props: UiIrJourneyProps): ReactElement {
  const [journey, setJourney] = useState<UiIrJourneyState>(() =>
    props.controller.getState(),
  );
  const handleAction = useMemo(
    () =>
      createUiIrActionHandler({
        ...props.actionPorts,
        journey: props.controller,
      }),
    [props.actionPorts, props.controller],
  );
  const rendererPorts = useMemo<UiIrRendererPorts>(
    () => ({ ...props.rendererPorts, handleAction }),
    [handleAction, props.rendererPorts],
  );

  useEffect(() => {
    const unsubscribe = props.controller.subscribe(setJourney);
    props.controller.start();
    return unsubscribe;
  }, [props.controller]);

  /*
   * The first screen arrives with the host; every screen after it plays the
   * entrance the document names for the direction of travel. The direction
   * is read from the depth the journey just left, before it is replaced —
   * depth, not position: two branches of one fork share a step, and a
   * placement opened mid-walk changes the screen without changing either.
   */
  const lastDepth = useRef<number | null>(null);
  const lastScreenId = useRef<string | null>(null);
  const direction: UiIrJourneyDirection =
    lastDepth.current !== null && journey.depth < lastDepth.current
      ? "back"
      : "forward";
  const navigated =
    lastScreenId.current !== null &&
    lastScreenId.current !== journey.activeScreenId;
  useEffect(() => {
    lastDepth.current = journey.depth;
    lastScreenId.current = journey.activeScreenId;
  }, [journey.depth, journey.activeScreenId]);

  /*
   * The chrome — what lives above the screens — mounts once and is handed
   * each screen through its slot, so a header's progress bar animates across
   * steps and nothing above the screen remounts. A screen opts out (its
   * welcome, a paywall) or names the variant the chrome renders for it.
   */
  const activeScreen = findUiIrScreen(props.document, journey.activeScreenId);
  /*
   * A screen that leaves on its own — a loading step — continues exactly as
   * a press would, after its wait. The timer is the screen's: a back or a
   * placement opened meanwhile clears it, and a screen walked to again
   * starts a fresh one.
   */
  const controller = props.controller;
  const autoContinueMs = activeScreen.autoContinue?.afterMs;
  useEffect(() => {
    if (autoContinueMs === undefined) return;
    const timer = setTimeout(() => controller.next(), autoContinueMs);
    return () => clearTimeout(timer);
  }, [autoContinueMs, controller, journey.activeScreenId, journey.depth]);
  const chrome = props.document.chrome;
  const chromeSetting = activeScreen.chrome;
  const wrapped = chrome !== undefined && chromeSetting !== false;
  const variant = typeof chromeSetting === "string" ? chromeSetting : null;
  const screen = (
    <UiIrScreen
      answers={props.answers}
      document={props.document}
      insets={wrapped ? "none" : "auto"}
      locale={props.locale}
      plans={props.plans}
      ports={rendererPorts}
      screenId={journey.activeScreenId}
      transition={
        navigated
          ? uiIrScreenEnterTransition({
              document: props.document,
              screen: activeScreen,
              direction,
            })
          : null
      }
    />
  );
  return (
    <UiIrJourneyProvider
      isFirst={journey.isFirst}
      isLast={journey.isLast}
      position={journey.position}
      total={journey.total}
      variant={variant}
    >
      {wrapped && chrome ? (
        <UiIrChrome
          activeScreenId={journey.activeScreenId}
          answers={props.answers}
          chrome={chrome}
          document={props.document}
          locale={props.locale}
          plans={props.plans}
          ports={rendererPorts}
          renderSlot={() => screen}
        />
      ) : (
        screen
      )}
    </UiIrJourneyProvider>
  );
}

function UiIrChrome(props: {
  document: BuilderV2UiIrDocument;
  chrome: NonNullable<BuilderV2UiIrDocument["chrome"]>;
  /**
   * The step the person is on. A press in the chrome — the back control —
   * happens on that step and is reported as its event, not as the chrome's;
   * the chrome's own state still lives under "chrome".
   */
  activeScreenId: string;
  answers?: UiIrAnswerStore;
  locale?: string;
  plans?: UiIrPlanSnapshot;
  ports: UiIrRendererPorts;
  renderSlot: () => ReactElement;
}): ReactElement {
  const insets = useContext(SafeAreaInsetsContext);
  const assets = useMemo(
    () => new Map(props.document.assets.map((asset) => [asset.assetId, asset])),
    [props.document],
  );
  const chromeScreen = useMemo(
    () => ({ screenId: "chrome", state: props.chrome.state }),
    [props.chrome],
  );
  const tree = (
    <UiIrScreenStateProvider screen={chromeScreen} answers={props.answers}>
      <UiIrPlansProvider snapshot={props.plans ?? EMPTY_UI_IR_PLAN_SNAPSHOT}>
        <UiIrNode
          assets={assets}
          document={props.document}
          locale={props.locale}
          node={props.chrome.root}
          ports={props.ports}
          renderSlot={props.renderSlot}
          screenId={props.activeScreenId}
        />
      </UiIrPlansProvider>
    </UiIrScreenStateProvider>
  );
  // The chrome owns the whole canvas, so the unsafe bands are its to pad —
  // by the same rule a screen follows when it stands alone.
  const wantsInsets =
    insets !== null &&
    (insets.top > 0 || insets.bottom > 0) &&
    uiIrScreenWantsInsets(props.chrome.root);
  if (!wantsInsets) return tree;
  const background =
    props.chrome.root.style && typeof props.chrome.root.style === "object"
      ? (props.chrome.root.style as { backgroundColor?: unknown }).backgroundColor
      : undefined;
  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        ...(typeof background === "string" ? { backgroundColor: background } : {}),
      }}
    >
      {tree}
    </View>
  );
}
