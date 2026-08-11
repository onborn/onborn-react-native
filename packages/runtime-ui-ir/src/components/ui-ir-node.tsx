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

type UiIrNodeProps = {
  document: BuilderV2UiIrDocument;
  node: BuilderV2UiIrNode;
  screenId: string;
  locale?: string;
  ports: UiIrRendererPorts;
  assets: ReadonlyMap<string, BuilderV2UiIrAsset>;
};

export function UiIrNode(props: UiIrNodeProps): ReactElement {
  const element = renderNodeElement(props);
  return decorateRenderedUiIrNode(props.ports, {
    screenId: props.screenId,
    node: props.node,
    element,
  });
}

function renderNodeElement(props: UiIrNodeProps): ReactElement {
  const common = createUiIrNodeCommonProps(
    props.node,
    props.document,
    props.locale,
  );
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
            style={props.node.style}
          >
            {renderChildren(props)}
          </UiIrAnimatedView>
        );
      }
      if (props.node.type === "safe-area-view") {
        return (
          <SafeAreaView {...common} style={asViewStyle(props.node.style)}>
            {renderChildren(props)}
          </SafeAreaView>
        );
      }
      if (props.node.type === "scroll-view") {
        return (
          <ScrollView {...common} style={asViewStyle(props.node.style)}>
            {renderChildren(props)}
          </ScrollView>
        );
      }
      return (
        <View {...common} style={asViewStyle(props.node.style)}>
          {renderChildren(props)}
        </View>
      );
    case "text":
      return (
        <Text {...common} style={asTextStyle(props.node.style)}>
          {resolveUiIrText(props.document, props.node.text, props.locale)}
        </Text>
      );
    case "image":
      return (
        <Image
          {...common}
          source={resolveAsset(props, props.node.assetId)}
          resizeMode={props.node.resizeMode}
          style={asImageStyle(props.node.style)}
        />
      );
    case "image-background":
      return (
        <ImageBackground
          {...common}
          source={resolveAsset(props, props.node.assetId)}
          resizeMode={props.node.resizeMode}
          style={asViewStyle(props.node.style)}
        >
          {renderChildren(props)}
        </ImageBackground>
      );
    case "pressable":
      return (
        <UiIrPressable
          accessibilityLabel={common.accessibilityLabel}
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
  }
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
