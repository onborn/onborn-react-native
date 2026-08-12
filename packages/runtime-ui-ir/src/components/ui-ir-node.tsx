import type { ReactElement } from "react";
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
      if (
        props.node.enterTransition ||
        props.node.exitTransition ||
        props.node.layoutTransition
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
      return <UiIrPhosphorIcon node={props.node} />;
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
     * The subtree is described once and instantiated per plan. Each instance
     * names which plan it is, so a `{ current: true }` binding inside it reads
     * that plan's price rather than the first one's.
     */
    case "billing-plans":
      return <UiIrPlanRepeat {...props} node={props.node} />;
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

function renderChildren(props: UiIrNodeProps): ReactElement[] {
  if (!("children" in props.node)) {
    return [];
  }
  return props.node.children.map((child) => (
    <UiIrNode {...props} key={child.id} node={child} />
  ));
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
