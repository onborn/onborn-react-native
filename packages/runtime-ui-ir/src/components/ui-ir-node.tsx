import type { ReactElement } from "react";
import {
  Image,
  ImageBackground,
  Modal,
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
import { UiIrChart } from "./ui-ir-chart";
import { UiIrPhosphorIcon } from "./ui-ir-phosphor-icon";
import { UiIrPressable } from "./ui-ir-pressable";
import { UiIrVectorNode } from "./ui-ir-vector-node";
import { uiIrGateHolds } from "../domain/ui-ir-state";
import {
  resolveUiIrPlanField,
  uiIrPlanCount,
  type UiIrPlanSnapshot,
} from "../domain/ui-ir-plans";
import { UiIrCurrentPlanProvider, useUiIrPlans } from "./ui-ir-plans-context";
import { useUiIrScreenState } from "./ui-ir-screen-state";

type UiIrNodeProps = {
  document: BuilderV2UiIrDocument;
  node: BuilderV2UiIrNode;
  screenId: string;
  locale?: string;
  ports: UiIrRendererPorts;
  assets: ReadonlyMap<string, BuilderV2UiIrAsset>;
};

export function UiIrNode(props: UiIrNodeProps): ReactElement | null {
  const screenState = useUiIrScreenState();
  const plans = useUiIrPlans();
  const gate = {
    values: screenState.values,
    plans: plans.snapshot,
    currentPlanIndex: plans.currentIndex,
  };
  /*
   * Runtime-dependent appearance, all three slots the dialect has: a node may
   * not render at all, may merge variant styles while a selection holds, and
   * may report itself selected to a screen reader. Evaluated here, before the
   * per-type rendering, so every node type gets them for free.
   */
  if (props.node.presence && !uiIrGateHolds(props.node.presence, gate)) {
    return null;
  }
  const activeVariantStyle = (props.node.variants ?? [])
    .filter((variant) => uiIrGateHolds(variant.when, gate))
    .reduce<BuilderV2UiIrStyle>(
      (merged, variant) => ({ ...merged, ...variant.style }),
      {},
    );
  const nodeStyle: BuilderV2UiIrStyle | undefined =
    Object.keys(activeVariantStyle).length > 0
      ? { ...props.node.style, ...activeVariantStyle }
      : props.node.style;
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
): ReactElement {
  const common = {
    ...createUiIrNodeCommonProps(props.node, props.document, props.locale),
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
          {resolveUiIrNodeText(props, props.node.text, plans)}
        </Text>
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
): string {
  return text.kind === "billing"
    ? resolveUiIrPlanField(
        plans.snapshot,
        text.plan,
        text.field,
        plans.currentIndex,
      )
    : resolveUiIrText(props.document, text, props.locale);
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
  const selected = screenState.values[props.node.state] ?? null;
  return (
    <UiIrSegmentedControl
      accessibilityLabel={props.common.accessibilityLabel as string | undefined}
      labelStyle={asTextStyle(props.node.labelStyle)}
      onSelect={(value) => screenState.set(props.node.state, value)}
      pillStyle={asViewStyle(props.node.pillStyle)}
      segments={props.node.segments.map((segment) => ({
        value: segment.value,
        label: resolveUiIrNodeText(props, segment.label, props.plans),
      }))}
      selected={selected}
      selectedLabelStyle={asTextStyle(props.node.selectedLabelStyle)}
      style={asViewStyle(props.nodeStyle)}
    />
  );
}

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
    <Modal
      {...props.common}
      animationType="slide"
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
      transparent
      visible
    >
      <View style={asViewStyle(props.nodeStyle)}>{renderChildren(props)}</View>
    </Modal>
  );
}

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
    throw new Error(`UI IR lottie animation "${assetId}" is not in the document.`);
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

function hasCssAnimation(style: unknown): boolean {
  return (
    typeof style === "object" &&
    style !== null &&
    ("animationName" in style || "transitionProperty" in style)
  );
}
