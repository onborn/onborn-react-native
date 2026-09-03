import { useEffect, useMemo, useState, type ReactElement } from "react";
import {
  Image,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  View,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import type {
  BuilderV2UiIrAsset,
  BuilderV2UiIrDocument,
  BuilderV2UiIrJsonValue,
  BuilderV2UiIrNode,
  BuilderV2UiIrStyle,
} from "@onborn/sdk-contracts/builder-v2-ui-ir";

import { resolveUiIrText } from "../domain/ui-ir-document";
import {
  decorateRenderedUiIrNode,
  type UiIrRendererPorts,
} from "../ports/ui-ir-renderer";
import { createUiIrNodeCommonProps } from "./ui-ir-node-props";
import { UiIrAnimatedView } from "./ui-ir-animated-view";
import { UiIrCarousel } from "./ui-ir-carousel";
import { UiIrSegmentedControl } from "./ui-ir-segmented-control";
import { UiIrRulerPicker } from "./ui-ir-ruler-picker";
import { UiIrSwitch } from "./ui-ir-switch";
import { UiIrChart } from "./ui-ir-chart";
import { UiIrLinearGradient } from "./ui-ir-linear-gradient";
import { UiIrTextInput } from "./ui-ir-text-input";
import { UiIrJourneyProgress } from "./ui-ir-journey-progress";
import { UiIrProgressRing } from "./ui-ir-progress-ring";
import { UiIrVideo } from "./ui-ir-video";
import { UiIrModalSurface } from "./ui-ir-modal-surface";
import { useUiIrJourneyProgressContext } from "./ui-ir-journey-progress-context";
import type { UiIrVariables } from "../domain/ui-ir-answers";
import { UiIrPhosphorIcon } from "./ui-ir-phosphor-icon";
import { UiIrPressable } from "./ui-ir-pressable";
import { UiIrVectorNode } from "./ui-ir-vector-node";
import { uiIrGateHolds } from "../domain/ui-ir-state";
import { reconcileUiIrYogaAspectRatio } from "../domain/ui-ir-yoga-aspect-ratio";
import { toReanimatedCssStyle } from "./ui-ir-css-easing";
import {
  resolveUiIrPlanField,
  uiIrPlanCount,
  type UiIrPlanSnapshot,
} from "../domain/ui-ir-plans";
import { UiIrCurrentPlanProvider, useUiIrPlans } from "./ui-ir-plans-context";
import { useUiIrScreenState, useUiIrVariables } from "./ui-ir-screen-state";

type UiIrNodeProps = {
  document: BuilderV2UiIrDocument;
  node: BuilderV2UiIrNode;
  screenId: string;
  locale?: string;
  ports: UiIrRendererPorts;
  assets: ReadonlyMap<string, BuilderV2UiIrAsset>;
  /** What the chrome's screen-slot renders: the journey's current screen. */
  renderSlot?: () => ReactElement;
  /**
   * Set on a sheet playing its exit: the presence gate has let go, the
   * modal stays mounted for the length of the animation, and nothing in it
   * takes a touch meanwhile.
   */
  sheetClosing?: boolean;
};

export function UiIrNode(props: UiIrNodeProps): ReactElement | null {
  const screenState = useUiIrScreenState();
  const plans = useUiIrPlans();
  const variables = useUiIrVariables();
  const journey = useUiIrJourneyProgressContext();
  const gate = {
    values: screenState.values,
    plans: plans.snapshot,
    currentPlanIndex: plans.currentIndex,
    ...(journey.gate ? { journey: journey.gate } : {}),
  };
  /*
   * Runtime-dependent appearance, all three slots the dialect has: a node may
   * not render at all, may merge variant styles while a selection holds, and
   * may report itself selected to a screen reader. Evaluated here, before the
   * per-type rendering, so every node type gets them for free.
   */
  if (props.node.type === "modal" && props.node.presence) {
    return (
      <UiIrModalPresence
        {...props}
        node={props.node}
        open={uiIrGateHolds(props.node.presence, gate)}
      />
    );
  }
  if (props.node.presence && !uiIrGateHolds(props.node.presence, gate)) {
    return null;
  }
  const activeVariantStyle = (props.node.variants ?? [])
    .filter((variant) => uiIrGateHolds(variant.when, gate))
    .reduce<BuilderV2UiIrStyle>(
      (merged, variant) => ({ ...merged, ...variant.style }),
      {},
    );
  const nodeStyle: BuilderV2UiIrStyle | undefined = toReanimatedCssStyle(
    reconcileUiIrYogaAspectRatio(
      Object.keys(activeVariantStyle).length > 0
        ? { ...props.node.style, ...activeVariantStyle }
        : props.node.style,
    ),
  );
  const accessibilityState = props.node.accessibilitySelected
    ? {
        accessibilityState: {
          selected: uiIrGateHolds(props.node.accessibilitySelected, gate),
        },
      }
    : {};
  const element = renderNodeElement(
    props,
    nodeStyle,
    accessibilityState,
    plans,
    variables,
  );
  return decorateRenderedUiIrNode(props.ports, {
    screenId: props.screenId,
    node: props.node,
    element,
  });
}

function renderNodeElement(
  props: UiIrNodeProps,
  nodeStyle: BuilderV2UiIrStyle | undefined,
  accessibilityState: {
    accessibilityState?: { selected: boolean };
  },
  plans: { snapshot: UiIrPlanSnapshot; currentIndex: number | null },
  variables: UiIrVariables,
): ReactElement {
  const common = {
    ...createUiIrNodeCommonProps(
      props.node,
      props.document,
      props.locale,
      variables,
    ),
    ...accessibilityState,
  };
  switch (props.node.type) {
    case "view":
    case "safe-area-view":
    case "scroll-view":
      /*
       * CSS animations are declarative style — animationName, duration,
       * iteration count — and Reanimated applies them only on an Animated
       * component. A node whose style carries one, but which has no
       * entering or exiting transition, used to render as a plain View and
       * the animation silently did nothing: a pulsing CTA that did not pulse.
       */
      if (
        props.node.enterTransition ||
        props.node.exitTransition ||
        props.node.layoutTransition ||
        hasCssAnimation(nodeStyle)
      ) {
        return (
          <UiIrAnimatedView
            {...common}
            enterTransition={props.node.enterTransition}
            exitTransition={props.node.exitTransition}
            kind={props.node.type}
            layoutTransition={props.node.layoutTransition}
            style={nodeStyle}
          >
            {renderChildren(props)}
          </UiIrAnimatedView>
        );
      }
      if (props.node.type === "safe-area-view") {
        return (
          <SafeAreaView {...common} style={asViewStyle(nodeStyle)}>
            {renderChildren(props)}
          </SafeAreaView>
        );
      }
      if (props.node.type === "scroll-view") {
        return (
          <ScrollView {...common} style={asViewStyle(nodeStyle)}>
            {renderChildren(props)}
          </ScrollView>
        );
      }
      return (
        <View {...common} style={asViewStyle(nodeStyle)}>
          {renderChildren(props)}
        </View>
      );
    case "text":
      return (
        <Text {...common} style={asTextStyle(nodeStyle)}>
          {resolveUiIrNodeText(props, props.node.text, plans, variables)}
        </Text>
      );
    case "screen-slot":
      return props.renderSlot ? (
        props.renderSlot()
      ) : (
        <View {...common} style={SLOT_FILL} />
      );
    case "progress-ring":
      return (
        <UiIrProgressRing
          accessibilityLabel={common.accessibilityLabel}
          color={props.node.color}
          durationMs={props.node.durationMs}
          showsPercent={props.node.showsPercent}
          size={props.node.size}
          strokeWidth={props.node.strokeWidth}
          style={asViewStyle(nodeStyle)}
          textStyle={props.node.textStyle as TextStyle | undefined}
          trackColor={props.node.trackColor}
        />
      );
    case "journey-progress":
      return (
        <UiIrJourneyProgress
          accessibilityLabel={common.accessibilityLabel}
          fillStyle={props.node.fillStyle as ViewStyle | undefined}
          from={props.node.from}
          style={asViewStyle(nodeStyle)}
        />
      );
    case "text-input":
      return (
        <UiIrTextInput
          accessibilityLabel={common.accessibilityLabel}
          node={props.node}
          placeholder={
            props.node.placeholder
              ? resolveUiIrNodeText(
                  props,
                  props.node.placeholder,
                  plans,
                  variables,
                )
              : undefined
          }
          ports={props.ports}
          screenId={props.screenId}
          style={nodeStyle}
        />
      );
    case "image":
      return (
        <Image
          {...common}
          source={resolveAsset(props, props.node.assetId)}
          resizeMode={props.node.resizeMode}
          style={asImageStyle(nodeStyle)}
        />
      );
    case "video":
      return (
        <UiIrVideo
          accessibilityLabel={common.accessibilityLabel}
          host={{
            ports: props.ports,
            screenId: props.screenId,
            nodeId: props.node.id,
          }}
          loop={props.node.loop}
          muted={props.node.muted}
          resizeMode={props.node.resizeMode}
          source={resolveAsset(props, props.node.assetId)}
          style={asViewStyle(nodeStyle)}
        />
      );
    case "image-background":
      return (
        <ImageBackground
          {...common}
          source={resolveAsset(props, props.node.assetId)}
          resizeMode={props.node.resizeMode}
          style={asViewStyle(nodeStyle)}
        >
          {renderChildren(props)}
        </ImageBackground>
      );
    case "linear-gradient":
      return (
        <UiIrLinearGradient
          accessibilityLabel={common.accessibilityLabel}
          accessibilityState={accessibilityState.accessibilityState}
          node={props.node}
          style={nodeStyle}
        >
          {renderChildren(props)}
        </UiIrLinearGradient>
      );
    case "pressable":
      return (
        <UiIrPressable
          accessibilityLabel={common.accessibilityLabel}
          accessibilityState={accessibilityState.accessibilityState}
          style={nodeStyle}
          node={props.node}
          ports={props.ports}
          screenId={props.screenId}
        >
          {renderChildren(props)}
        </UiIrPressable>
      );
    case "phosphor-icon":
      return <UiIrPhosphorIcon icons={props.ports.icons} node={props.node} />;
    case "status-bar":
      return <StatusBar barStyle={props.node.barStyle} />;
    case "svg":
    case "svg-group":
      return (
        <UiIrVectorNode
          accessibilityLabel={common.accessibilityLabel}
          node={props.node}
        >
          {renderChildren(props)}
        </UiIrVectorNode>
      );
    case "svg-path":
    case "svg-circle":
      return (
        <UiIrVectorNode
          accessibilityLabel={common.accessibilityLabel}
          node={props.node}
        >
          {null}
        </UiIrVectorNode>
      );
    case "capability":
      return (
        <>
          {props.ports.renderCapability({
            screenId: props.screenId,
            nodeId: props.node.id,
            capability: props.node.capability,
            component: props.node.component,
            props: props.node.props,
          })}
        </>
      );
    /*
     * The player is lent by the host, like the camera: a native module the
     * SDK does not bundle. The node arrives at the same port a host
     * capability component does, with the animation resolved from the
     * document so the host renders what it is handed and resolves nothing.
     */
    case "lottie":
      return (
        <>
          {props.ports.renderCapability({
            screenId: props.screenId,
            nodeId: props.node.id,
            capability: "lottie",
            component: "LottieView",
            props: {
              animation: resolveLottie(props, props.node.assetId),
              loop: props.node.loop,
              ...(props.node.speed !== undefined
                ? { speed: props.node.speed }
                : {}),
              ...(props.node.resizeMode
                ? { resizeMode: props.node.resizeMode }
                : {}),
              ...(nodeStyle
                ? { style: nodeStyle as BuilderV2UiIrJsonValue }
                : {}),
              ...(common.accessibilityLabel
                ? { accessibilityLabel: common.accessibilityLabel }
                : {}),
            },
          })}
        </>
      );
    /*
     * The subtree is described once and instantiated per plan. Each instance
     * names which plan it is, so a `{ current: true }` binding inside it reads
     * that plan's price rather than the first one's.
     */
    case "billing-plans":
      return <UiIrPlanRepeat {...props} node={props.node} />;
    /*
     * Presented above the screen. Presence already decided this node renders
     * at all, so the platform modal is always visible here — the two would
     * otherwise be two sources of truth for one thing.
     */
    case "chart":
      return (
        <UiIrChart
          accessibilityLabel={common.accessibilityLabel}
          series={props.node.series}
          style={nodeStyle as never}
          variant={props.node.variant}
        />
      );
    /*
     * The document names the segments and the state; the runtime owns the
     * pill and its movement, because a slide driven by interaction is motion
     * the document cannot carry.
     */
    case "segmented-control":
      return (
        <UiIrSegmentedNode
          {...props}
          common={common}
          node={props.node}
          nodeStyle={nodeStyle}
          plans={plans}
        />
      );
    /*
     * The document names the range and the state; the runtime owns the drag,
     * the snap and the counting number, because a gesture is motion the
     * document cannot carry.
     */
    case "ruler-picker":
      return (
        <UiIrRulerNode
          {...props}
          common={common}
          node={props.node}
          nodeStyle={nodeStyle}
        />
      );
    /*
     * The flip is the platform's animation, which the document cannot carry;
     * the node names the state and the value that means "on".
     */
    case "switch":
      return (
        <UiIrSwitchNode
          {...props}
          common={common}
          node={props.node}
          nodeStyle={nodeStyle}
        />
      );
    /*
     * One page per child, paged by the runtime because the page width is the
     * device's and the document may not read it.
     */
    case "carousel":
      return (
        <UiIrCarousel
          accessibilityLabel={common.accessibilityLabel}
          {...(props.node.autoAdvanceMs === undefined
            ? {}
            : { autoAdvanceMs: props.node.autoAdvanceMs })}
          showsIndicator={props.node.showsIndicator}
          {...carouselIndicatorProps(props.node.indicator)}
          style={nodeStyle as never}
        >
          {renderChildren(props)}
        </UiIrCarousel>
      );
    case "modal":
      return (
        <UiIrModal
          {...props}
          node={props.node}
          common={common}
          nodeStyle={nodeStyle}
        />
      );
  }
}

/**
 * Text is literal, localized, or read from the offering.
 *
 * The billing case is resolved here rather than in `resolveUiIrText` because it
 * needs the loaded plans, which are context and not part of the document.
 */
function resolveUiIrNodeText(
  props: UiIrNodeProps,
  text: Extract<BuilderV2UiIrNode, { type: "text" }>["text"],
  plans: { snapshot: UiIrPlanSnapshot; currentIndex: number | null },
  variables: UiIrVariables,
): string {
  return text.kind === "billing"
    ? resolveUiIrPlanField(
        plans.snapshot,
        text.plan,
        text.field,
        plans.currentIndex,
      )
    : resolveUiIrText(props.document, text, props.locale, variables);
}

function UiIrSegmentedNode(
  props: UiIrNodeProps & {
    node: Extract<BuilderV2UiIrNode, { type: "segmented-control" }>;
    common: Record<string, unknown>;
    nodeStyle: BuilderV2UiIrStyle | undefined;
    plans: { snapshot: UiIrPlanSnapshot; currentIndex: number | null };
  },
): ReactElement {
  const screenState = useUiIrScreenState();
  const variables = useUiIrVariables();
  const selected = screenState.values[props.node.state] ?? null;
  return (
    <UiIrSegmentedControl
      accessibilityLabel={props.common.accessibilityLabel as string | undefined}
      labelStyle={asTextStyle(props.node.labelStyle)}
      onSelect={(value) => screenState.set(props.node.state, value)}
      pillStyle={asViewStyle(props.node.pillStyle)}
      segments={props.node.segments.map((segment) => ({
        value: segment.value,
        label: resolveUiIrNodeText(
          props,
          segment.label,
          props.plans,
          variables,
        ),
      }))}
      selected={selected}
      selectedLabelStyle={asTextStyle(props.node.selectedLabelStyle)}
      style={asViewStyle(props.nodeStyle)}
    />
  );
}

function UiIrRulerNode(
  props: UiIrNodeProps & {
    node: Extract<BuilderV2UiIrNode, { type: "ruler-picker" }>;
    common: Record<string, unknown>;
    nodeStyle: BuilderV2UiIrStyle | undefined;
  },
): ReactElement {
  const screenState = useUiIrScreenState();
  const { node } = props;
  const value = screenState.values[node.state] ?? null;
  // A light tap per tick, through the host's haptics like a Pressable's.
  const onTick = node.haptic
    ? () => {
        void Promise.resolve(
          props.ports.handleAction({
            screenId: props.screenId,
            nodeId: node.id,
            action: {
              type: "capability.invoke",
              capability: "haptics",
              method: "trigger",
              input: "light",
            },
          }),
        ).catch(() => undefined);
      }
    : undefined;
  return (
    <UiIrRulerPicker
      accessibilityLabel={props.common.accessibilityLabel as string | undefined}
      fractionDigits={node.fractionDigits}
      indicatorColor={node.indicatorColor}
      majorEvery={node.majorEvery}
      majorTickColor={node.majorTickColor}
      max={node.max}
      min={node.min}
      onChange={(reading) => screenState.set(node.state, reading)}
      onTick={onTick}
      step={node.step}
      style={asViewStyle(props.nodeStyle)}
      tickColor={node.tickColor}
      tickLabelStyle={asTextStyle(node.tickLabelStyle)}
      unit={node.unit}
      unitStyle={asTextStyle(node.unitStyle)}
      value={value}
      valueStyle={asTextStyle(node.valueStyle)}
    />
  );
}

function UiIrSwitchNode(
  props: UiIrNodeProps & {
    node: Extract<BuilderV2UiIrNode, { type: "switch" }>;
    common: Record<string, unknown>;
    nodeStyle: BuilderV2UiIrStyle | undefined;
  },
): ReactElement {
  const screenState = useUiIrScreenState();
  const { node } = props;
  const value = screenState.values[node.state] ?? null;
  return (
    <UiIrSwitch
      accessibilityLabel={props.common.accessibilityLabel as string | undefined}
      offTrackColor={node.offTrackColor}
      onChange={(next) => {
        screenState.set(node.state, next);
        // A light tap per flip, through the host's haptics like a Pressable's.
        if (!node.haptic) return;
        void Promise.resolve(
          props.ports.handleAction({
            screenId: props.screenId,
            nodeId: node.id,
            action: {
              type: "capability.invoke",
              capability: "haptics",
              method: "trigger",
              input: "light",
            },
          }),
        ).catch(() => undefined);
      }}
      onValue={node.onValue}
      style={asViewStyle(props.nodeStyle)}
      thumbColor={node.thumbColor}
      trackColor={node.trackColor}
      value={value}
    />
  );
}

const FILL_SURFACE = { flex: 1 } as const;

function UiIrModal(
  props: UiIrNodeProps & {
    node: Extract<BuilderV2UiIrNode, { type: "modal" }>;
    common: Record<string, unknown>;
    nodeStyle: BuilderV2UiIrStyle | undefined;
  },
): ReactElement {
  const screenState = useUiIrScreenState();
  const { dismiss } = props.node;
  return (
    <UiIrModalSurface
      common={props.common}
      open={props.sheetClosing !== true}
      /*
       * A selection never leaves the device, so the Pressable settles
       * `state.set` itself and the action handler has no case for it. The
       * dismissal of a sheet is almost always exactly that, and routing it to
       * the handler would have closed nothing at all.
       */
      onRequestClose={() => {
        if (dismiss.type === "state.set") {
          screenState.set(dismiss.state, dismiss.value);
          return;
        }
        void props.ports.handleAction({
          screenId: props.screenId,
          nodeId: props.node.id,
          action: dismiss,
        });
      }}
    >
      {/*
       * Fills the surface. The Modal's child in the source is a plain View
       * that carries no size of its own; on the web's in-frame layer it took
       * its content's height, and a sheet meant to sit on the bottom edge
       * sat on the top one with its scrim no taller than the card.
       */}
      <View style={[FILL_SURFACE, asViewStyle(props.nodeStyle)]}>
        {renderChildren(props)}
      </View>
    </UiIrModalSurface>
  );
}

/*
 * A sheet leaves the way it came. Its presence gate is a selection — the
 * picker state — and the moment that changes the node would be gone from
 * the tree with no frame to slide out in. The modal is kept mounted for the
 * length of the exit and rendered without its gate, closing; then it goes.
 */
function UiIrModalPresence(
  props: UiIrNodeProps & {
    node: Extract<BuilderV2UiIrNode, { type: "modal" }>;
    open: boolean;
  },
): ReactElement | null {
  const { open, node } = props;
  const [shown, setShown] = useState(open);
  useEffect(() => {
    if (open) {
      setShown(true);
      return;
    }
    const timer = setTimeout(() => setShown(false), SHEET_MS);
    return () => clearTimeout(timer);
  }, [open]);
  const ungated = useMemo(() => {
    const copy = { ...node };
    delete copy.presence;
    return copy;
  }, [node]);
  if (!open && !shown) return null;
  return <UiIrNode {...props} node={ungated} sheetClosing={!open} />;
}

// How long the platform modal takes to slide away; the node outlives its
// gate by this much so the exit is seen.
const SHEET_MS = 300;

/*
 * The scrim fades in where it is; the card slides up. One animation over
 * the whole modal — the platform's "slide" — carried the scrim up with the
 * card, and its top edge was seen climbing the screen behind the sheet.
 *
 * A sheet is written as a root that fills the modal, holding an
 * absolutely-filled scrim beside the card. That is what is split: the
 * absolute-fill children of the root go on the fading layer, the rest on
 * the sliding one, which keeps the root's own layout (a flex-end column).
 * Anything shaped differently fades and slides as one.
 */

function UiIrPlanRepeat(
  props: UiIrNodeProps & {
    node: Extract<BuilderV2UiIrNode, { type: "billing-plans" }>;
  },
): ReactElement {
  const { snapshot } = useUiIrPlans();
  const count = uiIrPlanCount(snapshot, props.node.limit);
  return (
    <>
      {Array.from({ length: count }, (_unused, index) => (
        <UiIrCurrentPlanProvider index={index} key={index}>
          {props.node.children.map((child) => (
            <UiIrNode {...props} key={child.id} node={child} />
          ))}
        </UiIrCurrentPlanProvider>
      ))}
    </>
  );
}

/*
 * The artifact stores the indicator as one object; the component takes the
 * flat props a screen writes in JSX, so both paths render the same dots.
 */
function carouselIndicatorProps(
  indicator:
    | {
        size?: number;
        spacing?: number;
        color?: string;
        activeColor?: string;
        activeWidth?: number;
        placement?: "top" | "bottom";
      }
    | undefined,
) {
  if (!indicator) return {};
  return {
    ...(indicator.size === undefined ? {} : { indicatorSize: indicator.size }),
    ...(indicator.spacing === undefined
      ? {}
      : { indicatorSpacing: indicator.spacing }),
    ...(indicator.color === undefined
      ? {}
      : { indicatorColor: indicator.color }),
    ...(indicator.activeColor === undefined
      ? {}
      : { indicatorActiveColor: indicator.activeColor }),
    ...(indicator.activeWidth === undefined
      ? {}
      : { indicatorActiveWidth: indicator.activeWidth }),
    ...(indicator.placement === undefined
      ? {}
      : { indicatorPlacement: indicator.placement }),
  };
}

function renderChildren(props: UiIrNodeProps): ReactElement[] {
  if (!("children" in props.node)) {
    return [];
  }
  return props.node.children.map((child) => (
    <UiIrNode {...props} key={child.id} node={child} />
  ));
}

function resolveLottie(
  props: UiIrNodeProps,
  assetId: string,
): BuilderV2UiIrJsonValue {
  const entry = props.document.lottie?.find(
    (candidate) => candidate.assetId === assetId,
  );
  if (!entry) {
    // The document contract forbids this; a document that slipped past it
    // should fail loudly rather than draw a blank where the artwork was.
    throw new Error(
      `UI IR lottie animation "${assetId}" is not in the document.`,
    );
  }
  return entry.animation as BuilderV2UiIrJsonValue;
}

function resolveAsset(
  props: UiIrNodeProps,
  assetId: string,
): ReturnType<UiIrRendererPorts["resolveAsset"]> {
  const asset = props.assets.get(assetId);
  if (!asset) {
    throw new Error(`UI IR asset "${assetId}" is not declared.`);
  }
  return props.ports.resolveAsset(asset);
}

function asViewStyle(style?: BuilderV2UiIrStyle): ViewStyle | undefined {
  return style as ViewStyle | undefined;
}

function asTextStyle(style?: BuilderV2UiIrStyle): TextStyle | undefined {
  return style as TextStyle | undefined;
}

function asImageStyle(style?: BuilderV2UiIrStyle): ImageStyle | undefined {
  return style as ImageStyle | undefined;
}

const SLOT_FILL = { flex: 1 } as const;

function hasCssAnimation(style: unknown): boolean {
  return (
    typeof style === "object" &&
    style !== null &&
    ("animationName" in style || "transitionProperty" in style)
  );
}
