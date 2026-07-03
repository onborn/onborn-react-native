import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { resolveLayoutPresetConfig } from "../../config/layout";
import { ScreenLayout } from "../Layout/ScreenLayout";
import { CarouselRuntimeProvider } from "../primitives";
import { renderScreen } from "./renderScreen";
import type { PrimitiveInstance, PrimitiveRenderOptions } from "./types";
import { useResponsiveScale } from "../responsive";

export type FunnelScreenRendererProps = {
  primitives: PrimitiveInstance[];
  persistentPrimitives?: PrimitiveInstance[];
  stepAnimation?: Pick<
    React.ComponentProps<typeof Animated.View>,
    "entering" | "exiting" | "layout"
  > & {
    key: string;
    durationMs?: number;
  };
  options?: PrimitiveRenderOptions;
};

export function FunnelScreenRenderer({
  primitives,
  persistentPrimitives,
  stepAnimation,
  options,
}: FunnelScreenRendererProps) {
  const { scaleRadius, scaleSpace } = useResponsiveScale();
  const renderOptions = {
    ...options,
    responsive: { scaleRadius, scaleSpace },
  };
  const stepRenderOptions = {
    ...renderOptions,
    selectableIdPrefix: options?.onPrimitivePress ? "step:" : undefined,
  };
  const persistentRenderOptions = {
    ...renderOptions,
    selectableIdPrefix: options?.onPrimitivePress ? "flow:" : undefined,
  };
  const layout = options?.layout ?? resolveLayoutPresetConfig("content_focused");
  const slotGap = scaleSpace(layout.spacing.gap);
  const stepSlots = renderScreen(primitives, stepRenderOptions);
  const persistentSlots = renderScreen(persistentPrimitives ?? [], persistentRenderOptions);
  const top = wrapAnimatedSlot("top", stepSlots.top, stepAnimation, slotGap);
  const hero = [
    ...persistentSlots.hero,
    ...wrapAnimatedSlot("hero", stepSlots.hero, stepAnimation, slotGap),
  ];
  const heroOverlayTop = [
    ...persistentSlots.heroOverlayTop,
    ...wrapAnimatedSlot(
      "hero-overlay-top",
      stepSlots.heroOverlayTop,
      stepAnimation,
      slotGap,
    ),
  ];
  const heroOverlayBottom = [
    ...persistentSlots.heroOverlayBottom,
    ...wrapAnimatedSlot(
      "hero-overlay-bottom",
      stepSlots.heroOverlayBottom,
      stepAnimation,
      slotGap,
    ),
  ];
  const content = [
    ...persistentSlots.content,
    ...wrapAnimatedSlot("content", stepSlots.content, stepAnimation, slotGap),
  ];
  const bottom = [
    ...persistentSlots.bottom,
    ...wrapAnimatedSlot("bottom", stepSlots.bottom, stepAnimation, slotGap),
  ];
  return (
    <CarouselRuntimeProvider>
      <ScreenLayout
        persistentTop={persistentSlots.top}
        top={top}
        hero={hero}
        heroOverlayTop={heroOverlayTop}
        heroOverlayBottom={heroOverlayBottom}
        content={content}
        bottom={bottom}
        layout={layout}
        bg={options?.layoutBg}
        safeArea={options?.layoutSafeArea}
        keyboardAware={options?.layoutKeyboardAware}
      />
    </CarouselRuntimeProvider>
  );
}

function wrapAnimatedSlot(
  slot:
    | "top"
    | "hero"
    | "hero-overlay-top"
    | "hero-overlay-bottom"
    | "content"
    | "bottom",
  nodes: React.ReactNode[],
  animation: FunnelScreenRendererProps["stepAnimation"],
  gap: number,
): React.ReactNode[] {
  if (nodes.length === 0) {
    return [];
  }
  if (!animation) {
    return nodes;
  }

  if (Platform.OS === "web") {
    return [
      <WebStepSlot
        key={`${animation.key}-${slot}`}
        durationMs={animation.durationMs}
        gap={gap}
      >
        {nodes}
      </WebStepSlot>,
    ];
  }

  return [
    <Animated.View
      key={`${animation.key}-${slot}`}
      entering={animation.entering}
      exiting={animation.exiting}
      layout={animation.layout}
      style={[styles.animatedSlot, { gap }]}
    >
      {nodes}
    </Animated.View>,
  ];
}

function WebStepSlot({
  children,
  durationMs = 260,
  gap,
}: {
  children: React.ReactNode;
  durationMs?: number;
  gap: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <View
      style={[
        styles.animatedSlot,
        {
          gap,
          opacity: visible ? 1 : 0,
          transitionDuration: `${durationMs}ms`,
          transitionProperty: "opacity",
          transitionTimingFunction: "ease-out",
        } as ViewStyle,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  animatedSlot: {
    width: "100%",
  },
});
