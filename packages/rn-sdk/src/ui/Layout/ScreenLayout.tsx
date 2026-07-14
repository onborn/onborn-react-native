import type { LayoutPresetConfig } from "../../config/layout";
import {
  gradientAngleToStartEnd,
  resolveGradient,
  type LayoutBg,
  type LayoutSlot,
} from "@onborn/sdk-contracts";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import React, { useEffect, useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YStack } from "tamagui";
import { createAssetCacheKey } from "../assets/cache";
import { useResponsiveScale } from "../responsive";

export function ScreenLayout({
  persistentTop,
  top,
  hero,
  heroOverlayTop,
  heroOverlayBottom,
  content,
  bottom,
  layout,
  bg,
  safeArea,
  keyboardAware,
}: {
  persistentTop?: React.ReactNode[];
  top: React.ReactNode[];
  hero?: React.ReactNode[];
  heroOverlayTop?: React.ReactNode[];
  heroOverlayBottom?: React.ReactNode[];
  content: React.ReactNode[];
  bottom: React.ReactNode[];
  layout: LayoutPresetConfig;
  bg?: LayoutBg;
  safeArea?: boolean;
  keyboardAware?: boolean;
}) {
  const { flex, spacing, alignment, slots } = layout;
  const { scaleSpace } = useResponsiveScale();
  const insets = useSafeAreaInsets();
  const safeAreaEnabled = safeArea !== false;
  const safeAreaTop = safeAreaEnabled ? insets.top : 0;
  const safeAreaBottom = safeAreaEnabled ? insets.bottom : 0;
  const scaledSpacing = {
    paddingHorizontal: scaleSpace(spacing.paddingHorizontal),
    paddingTop: scaleSpace(spacing.paddingTop),
    paddingBottom: scaleSpace(spacing.paddingBottom),
    gap: scaleSpace(spacing.gap),
  };
  const isHeroLayout = layout.id === "hero";
  const isHeroSheetLayout = layout.id === "hero_sheet";
  const isEdgeToEdgeLayout = isHeroLayout || isHeroSheetLayout;
  const hasTopSlot = slots.includes("top");
  const heroNodes = hero ?? [];
  const heroOverlayTopNodes = heroOverlayTop ?? [];
  const heroOverlayBottomNodes = heroOverlayBottom ?? [];
  const persistentTopNodes = persistentTop ?? [];
  const heroSheetScrollY = useSharedValue(0);
  const heroSheetBaseOverlap = scaleSpace(24);
  const heroSheetMaxLift = scaleSpace(88);
  const heroSheetScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      heroSheetScrollY.value = event.contentOffset.y;
    },
  });
  const heroSheetScrollStyle = useAnimatedStyle(() => {
    const lift = interpolate(
      heroSheetScrollY.value,
      [0, heroSheetMaxLift],
      [0, heroSheetMaxLift],
      Extrapolation.CLAMP,
    );
    return {
      marginTop: -(heroSheetBaseOverlap + lift),
    };
  });

  const renderTopStack = (nodes: React.ReactNode[], key: string) => {
    if (nodes.length === 0) {
      return null;
    }
    return (
      <YStack key={key} flexShrink={0} gap={scaledSpacing.gap}>
        {nodes}
      </YStack>
    );
  };

  const renderHeroPersistentTop = () => {
    if (persistentTopNodes.length === 0) {
      return null;
    }
    return (
      <YStack
        key="persistent-top"
        flexShrink={0}
        paddingHorizontal={scaledSpacing.paddingHorizontal}
        paddingTop={safeAreaTop + scaledSpacing.paddingTop}
        paddingBottom={scaledSpacing.gap}
        gap={scaledSpacing.gap}
      >
        {persistentTopNodes}
      </YStack>
    );
  };

  const renderHeroOverlay = (
    nodes: React.ReactNode[],
    placement: "top" | "bottom",
  ) => {
    if (nodes.length === 0) {
      return null;
    }
    return (
      <YStack
        pointerEvents="box-none"
        position="absolute"
        left={0}
        right={0}
        top={placement === "top" ? 0 : undefined}
        bottom={placement === "bottom" ? 0 : undefined}
        zIndex={20}
        paddingHorizontal={scaledSpacing.paddingHorizontal}
        paddingTop={
          placement === "top"
            ? safeAreaTop + scaledSpacing.gap
            : undefined
        }
        paddingBottom={placement === "bottom" ? scaledSpacing.gap : undefined}
        gap={scaledSpacing.gap}
      >
        {nodes}
      </YStack>
    );
  };

  const renderSlot = (slot: LayoutSlot) => {
    switch (slot) {
      case "top":
        return renderTopStack([...persistentTopNodes, ...top], slot);
      case "content":
        if (content.length === 0) {
          return (
            <YStack
              key={slot}
              flex={flex.content ?? 1}
              minHeight={0}
              width="100%"
            />
          );
        }
        return (
          <ScrollView
            key={slot}
            style={[
              styles.contentScroll,
              { flex: flex.content ?? 1 },
            ]}
            contentContainerStyle={[
              styles.contentScrollContainer,
              {
                alignItems: alignment.contentAlign,
                justifyContent: alignment.contentJustify,
                gap: scaledSpacing.gap,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {content}
          </ScrollView>
        );
      case "bottom":
        if (bottom.length === 0) {
          return null;
        }
        return (
          <YStack
            key={slot}
            flexShrink={0}
            justifyContent="flex-end"
            gap={scaledSpacing.gap}
          >
            {bottom}
          </YStack>
        );
      case "hero":
        return null;
      default: {
        const _exhaustive: never = slot;
        return _exhaustive;
      }
    }
  };

  const renderHeroSlot = (slot: LayoutSlot) => {
    switch (slot) {
      case "hero":
        if (heroNodes.length === 0) {
          return null;
        }
        return (
          <YStack
            key={slot}
            position="relative"
            flexShrink={0}
            width="100%"
            gap={0}
            overflow="hidden"
          >
            {heroNodes}
            {renderHeroOverlay(heroOverlayTopNodes, "top")}
            {renderHeroOverlay(heroOverlayBottomNodes, "bottom")}
          </YStack>
        );
      case "content":
        if (content.length === 0) {
          return (
            <YStack
              key={slot}
              flex={flex.content ?? 1}
              minHeight={0}
              width="100%"
            />
          );
        }
        return (
          <ScrollView
            key={slot}
            style={[
              styles.contentScroll,
              { flex: flex.content ?? 1 },
            ]}
            contentContainerStyle={[
              styles.contentScrollContainer,
              {
                alignItems: alignment.contentAlign,
                justifyContent: alignment.contentJustify,
                gap: scaledSpacing.gap,
                paddingHorizontal: scaledSpacing.paddingHorizontal,
                paddingTop: scaledSpacing.paddingTop,
                paddingBottom: scaledSpacing.paddingBottom,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {content}
          </ScrollView>
        );
      case "bottom":
        if (bottom.length === 0) {
          return null;
        }
        return (
          <YStack
            key={slot}
            flexShrink={0}
            justifyContent="flex-end"
            gap={scaledSpacing.gap}
            paddingHorizontal={scaledSpacing.paddingHorizontal}
            paddingTop={scaledSpacing.gap}
            paddingBottom={scaledSpacing.paddingBottom + safeAreaBottom}
          >
            {bottom}
          </YStack>
        );
      case "top":
        return null;
      default: {
        const _exhaustive: never = slot;
        return _exhaustive;
      }
    }
  };

  const renderHeroSheetSlot = (slot: LayoutSlot) => {
    switch (slot) {
      case "hero":
        if (heroNodes.length === 0) {
          return null;
        }
        return (
          <YStack
            key={slot}
            position="relative"
            flexShrink={0}
            width="100%"
            gap={0}
            overflow="hidden"
          >
            {heroNodes}
            {renderHeroOverlay(heroOverlayTopNodes, "top")}
            {renderHeroOverlay(heroOverlayBottomNodes, "bottom")}
          </YStack>
        );
      case "content": {
        const hasHero = heroNodes.length > 0;
        if (content.length === 0) {
          return (
            <YStack
              key={slot}
              flex={flex.content ?? 1}
              minHeight={0}
              width="100%"
              marginTop={hasHero ? -heroSheetBaseOverlap : 0}
              borderTopLeftRadius={hasHero ? heroSheetBaseOverlap : 0}
              borderTopRightRadius={hasHero ? heroSheetBaseOverlap : 0}
              backgroundColor={bg?.type === "solid" ? bg.color : undefined}
            />
          );
        }
        return (
          <Animated.ScrollView
            key={slot}
            onScroll={hasHero ? heroSheetScrollHandler : undefined}
            scrollEventThrottle={16}
            style={[
              styles.contentScroll,
              {
                flex: flex.content ?? 1,
                marginTop: hasHero ? -heroSheetBaseOverlap : 0,
                borderTopLeftRadius: hasHero ? heroSheetBaseOverlap : 0,
                borderTopRightRadius: hasHero ? heroSheetBaseOverlap : 0,
                backgroundColor: bg?.type === "solid" ? bg.color : undefined,
              },
              hasHero ? heroSheetScrollStyle : null,
            ]}
            contentContainerStyle={[
              styles.contentScrollContainer,
              {
                alignItems: alignment.contentAlign,
                justifyContent: alignment.contentJustify,
                gap: scaledSpacing.gap,
                paddingHorizontal: scaledSpacing.paddingHorizontal,
                paddingTop: heroSheetBaseOverlap,
                paddingBottom: scaledSpacing.paddingBottom,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {content}
          </Animated.ScrollView>
        );
      }
      case "bottom":
        if (bottom.length === 0) {
          return null;
        }
        return (
          <YStack
            key={slot}
            flexShrink={0}
            justifyContent="flex-end"
            gap={scaledSpacing.gap}
            paddingHorizontal={scaledSpacing.paddingHorizontal}
            paddingTop={scaledSpacing.gap}
            paddingBottom={scaledSpacing.paddingBottom + safeAreaBottom}
            backgroundColor={bg?.type === "solid" ? bg.color : undefined}
          >
            {bottom}
          </YStack>
        );
      case "top":
        return null;
      default: {
        const _exhaustive: never = slot;
        return _exhaustive;
      }
    }
  };

  const contentNode = (
    <YStack
      flex={1}
      minHeight={0}
      paddingHorizontal={
        isEdgeToEdgeLayout ? 0 : scaledSpacing.paddingHorizontal
      }
      paddingTop={
        isEdgeToEdgeLayout ? 0 : scaledSpacing.paddingTop + safeAreaTop
      }
      paddingBottom={
        isEdgeToEdgeLayout ? 0 : scaledSpacing.paddingBottom + safeAreaBottom
      }
      gap={isEdgeToEdgeLayout ? 0 : scaledSpacing.gap}
      backgroundColor={bg?.type === "solid" ? bg.color : undefined}
    >
      {isEdgeToEdgeLayout ? renderHeroPersistentTop() : null}
      {!isEdgeToEdgeLayout && !hasTopSlot
        ? renderTopStack(persistentTopNodes, "persistent-top")
        : null}
      {slots.map(
        isHeroSheetLayout
          ? renderHeroSheetSlot
          : isHeroLayout
            ? renderHeroSlot
            : renderSlot,
      )}
    </YStack>
  );
  const keyboardAwareContentNode =
    keyboardAware && Platform.OS !== "web" ? (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        {contentNode}
      </KeyboardAvoidingView>
    ) : (
      contentNode
    );

  if (bg?.type === "linear_gradient") {
    const { colors, locations, angle } = resolveGradient(bg);
    const { start, end } = gradientAngleToStartEnd(angle);
    return (
      <LinearGradient
        colors={colors as [string, string, ...string[]]}
        locations={locations as [number, number, ...number[]] | undefined}
        start={start}
        end={end}
        style={{ flex: 1 }}
      >
        {keyboardAwareContentNode}
      </LinearGradient>
    );
  }

  if (bg?.type === "image" && bg.src) {
    return (
      <YStack flex={1} width="100%" height="100%" overflow="hidden">
        <ExpoImage
          source={{
            uri: bg.src,
            cacheKey: createAssetCacheKey({
              bucket: bg.bucket,
              path: bg.path,
              src: bg.src,
              prefix: "background",
            }),
          }}
          cachePolicy="memory-disk"
          contentFit={bg.resizeMode ?? "cover"}
          style={styles.backgroundImage}
        />
        {bg.overlayColor && (bg.overlayOpacity ?? 0) > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.backgroundImage,
              {
                backgroundColor: bg.overlayColor,
                opacity: bg.overlayOpacity ?? 0,
              },
            ]}
          />
        ) : null}
        <YStack flex={1} position="relative" zIndex={1}>
          {keyboardAwareContentNode}
        </YStack>
      </YStack>
    );
  }

  if (bg?.type === "video" && bg.src) {
    return (
      <VideoBackground
        src={bg.src}
        bucket={bg.bucket}
        path={bg.path}
        resizeMode={bg.resizeMode ?? "cover"}
      >
        {keyboardAwareContentNode}
      </VideoBackground>
    );
  }

  return keyboardAwareContentNode;
}

function VideoBackground({
  src,
  bucket,
  path,
  resizeMode,
  children,
}: {
  src: string;
  bucket?: string;
  path?: string;
  resizeMode: "cover" | "contain";
  children: React.ReactNode;
}) {
  const source = useMemo<VideoSource>(
    () => ({
      uri: src,
      useCaching: true,
    }),
    [src, bucket, path],
  );
  const player = useVideoPlayer(source, (nextPlayer) => {
    nextPlayer.loop = true;
    nextPlayer.muted = true;
  });

  useEffect(() => {
    player.loop = true;
    player.muted = true;
    player.play();
  }, [player]);

  return (
    <YStack
      flex={1}
      width="100%"
      height="100%"
      minHeight={0}
      minWidth={0}
      overflow="hidden"
      position="relative"
    >
      <VideoView
        player={player}
        nativeControls={false}
        contentFit={resizeMode}
        playsInline
        style={styles.videoBackground}
      />
      <YStack flex={1} position="relative" zIndex={1}>
        {children}
      </YStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  contentScroll: {
    minHeight: 0,
    width: "100%",
  },
  contentScrollContainer: {
    flexGrow: 1,
    width: "100%",
  },
  backgroundImage: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    width: "100%",
    height: "100%",
  },
  videoBackground: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    width: "100%",
    height: "100%",
  },
});
