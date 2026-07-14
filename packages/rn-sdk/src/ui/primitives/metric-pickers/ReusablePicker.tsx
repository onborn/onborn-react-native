import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type ListRenderItem,
  type TextStyle,
} from "react-native";
import { CaretDown } from "phosphor-react-native";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Text, XStack, YStack } from "tamagui";
import {
  resolveTextFontStyle,
  type OnbornFontWeight,
} from "../../typography/fonts";
import {
  ComponentGradientBg,
  resolveSolidBg,
  type ComponentBg,
} from "../background";

const PICKER_ITEM_HEIGHT = 56;
const PICKER_VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = PICKER_ITEM_HEIGHT * PICKER_VISIBLE_ITEMS;
const PICKER_SELECTED_SCALE = 1.12;

function resolveFontFamilyOverride(
  localFontFamily: string | undefined,
  fallbackFontFamily: string | undefined,
) {
  return localFontFamily && localFontFamily.trim().length > 0
    ? localFontFamily
    : fallbackFontFamily;
}

type ReusablePickerSelectorPrimitiveProps = {
  value: number;
  valueSuffix?: string;
  disabled?: boolean;
  selectorBg?: string;
  selectorBorderColor?: string;
  selectorBorderRadius?: number;
  selectorBorderWidth?: number;
  selectorHeight?: number;
  selectorPaddingHorizontal?: number;
  selectorPaddingVertical?: number;
  selectorLabel?: string;
  selectorLabelColor?: string;
  selectorLabelFontSize?: number;
  selectorLabelFontFamily?: string;
  selectorLabelFontWeight?: string;
  selectorValueColor?: string;
  selectorValueFontSize?: number;
  selectorValueFontFamily?: string;
  selectorValueFontWeight?: string;
  selectorChevronColor?: string;
  selectorChevronSize?: number;
  onPress: () => void;
};

export function ReusablePickerSelectorPrimitive({
  value,
  valueSuffix = "years",
  disabled = false,
  selectorBg = "#171B22",
  selectorBorderColor = "#2B3340",
  selectorBorderRadius = 18,
  selectorBorderWidth = 1,
  selectorHeight = 64,
  selectorPaddingHorizontal = 18,
  selectorPaddingVertical = 0,
  selectorLabel = "Age",
  selectorLabelColor = "#9CA5B3",
  selectorLabelFontSize = 12,
  selectorLabelFontFamily,
  selectorLabelFontWeight = "600",
  selectorValueColor = "#F3F5F8",
  selectorValueFontSize = 22,
  selectorValueFontFamily,
  selectorValueFontWeight = "800",
  selectorChevronColor = "#9CA5B3",
  selectorChevronSize = 22,
  onPress,
}: ReusablePickerSelectorPrimitiveProps) {
  return (
    <Pressable
      disabled={disabled}
      pointerEvents={disabled ? "none" : "auto"}
      onPress={onPress}
    >
      <XStack
        width="100%"
        minHeight={selectorHeight}
        borderRadius={selectorBorderRadius}
        borderWidth={selectorBorderWidth}
        borderColor={selectorBorderColor}
        backgroundColor={selectorBg}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={selectorPaddingHorizontal}
        paddingVertical={selectorPaddingVertical}
        gap={12}
      >
        <YStack gap={3}>
          <Text
            color={selectorLabelColor}
            fontSize={selectorLabelFontSize}
            {...resolveTextFontStyle({
              fontFamily: selectorLabelFontFamily,
              fontWeight: selectorLabelFontWeight as OnbornFontWeight,
            })}
          >
            {selectorLabel}
          </Text>
          <Text
            key={`reusable-picker-selector-value-${selectorValueFontFamily ?? "system"}-${selectorValueFontWeight ?? "400"}`}
            color={selectorValueColor}
            fontSize={selectorValueFontSize}
            {...resolveTextFontStyle({
              fontFamily: selectorValueFontFamily,
              fontWeight: selectorValueFontWeight as OnbornFontWeight,
            })}
          >
            {value} {valueSuffix}
          </Text>
        </YStack>
        <CaretDown
          color={selectorChevronColor}
          size={selectorChevronSize}
          weight="bold"
        />
      </XStack>
    </Pressable>
  );
}

type BottomSheetPrimitiveProps = {
  open: boolean;
  title: string;
  sheetBg?: ComponentBg;
  sheetTitleColor?: string;
  sheetTitleFontFamily?: string;
  sheetAccessory?: React.ReactNode;
  sheetRadius?: number;
  sheetHandleColor?: string;
  backdropColor?: string;
  children: React.ReactNode;
  onClose: () => void;
};

export function BottomSheetPrimitive({
  open,
  title,
  sheetBg = "#0E1116",
  sheetTitleColor = "#F3F5F8",
  sheetTitleFontFamily,
  sheetAccessory,
  sheetRadius = 28,
  sheetHandleColor = "#334155",
  backdropColor = "rgba(2, 6, 23, 0.58)",
  children,
  onClose,
}: BottomSheetPrimitiveProps) {
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          dragY.value = Math.max(0, gesture.dy);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 80 || gesture.vy > 0.85) {
            dragY.value = withTiming(360, { duration: 180 });
            onClose();
            return;
          }
          dragY.value = withTiming(0, { duration: 180 });
        },
        onPanResponderTerminate: () => {
          dragY.value = withTiming(0, { duration: 180 });
        },
      }),
    [dragY, onClose],
  );

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, { duration: 240 });
    if (open) {
      dragY.value = 0;
    }
  }, [open, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [360, 0]),
      },
      {
        translateY: dragY.value,
      },
    ],
  }));

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Animated.View
          style={[
            styles.backdrop,
            { backgroundColor: backdropColor },
            backdropStyle,
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: resolveSolidBg(sheetBg) ?? "#0E1116",
              borderTopLeftRadius: sheetRadius,
              borderTopRightRadius: sheetRadius,
            },
            sheetStyle,
          ]}
        >
          <ComponentGradientBg bg={sheetBg} radius={sheetRadius} />
          <View style={styles.sheetHeader} {...panResponder.panHandlers}>
            <View
              style={[styles.handle, { backgroundColor: sheetHandleColor }]}
            />
            <Text
              color={sheetTitleColor}
              fontSize={18}
              {...resolveTextFontStyle({
                fontFamily: sheetTitleFontFamily,
                fontWeight: "800",
              })}
            >
              {title}
            </Text>
            {sheetAccessory}
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

type ReusablePickerListItemProps = {
  value: number;
  index: number;
  scrollY: SharedValue<number>;
  selectedItemColor: string;
  itemColor: string;
  itemFontSize: number;
  selectedItemFontSize: number;
  itemFontFamily?: string;
  selectedItemFontWeight: string;
};

function ReusablePickerListItem({
  value,
  index,
  scrollY,
  selectedItemColor,
  itemColor,
  itemFontSize,
  selectedItemFontSize,
  itemFontFamily,
  selectedItemFontWeight,
}: ReusablePickerListItemProps) {
  const inactiveScale =
    selectedItemFontSize > 0 ? itemFontSize / selectedItemFontSize : 1;
  const textFontStyle = resolveTextFontStyle({
    fontFamily: itemFontFamily,
    fontWeight: selectedItemFontWeight as OnbornFontWeight,
  });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [
        (index - 2) * PICKER_ITEM_HEIGHT,
        index * PICKER_ITEM_HEIGHT,
        (index + 2) * PICKER_ITEM_HEIGHT,
      ],
      [0.42, 1, 0.42],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          scrollY.value,
          [
            (index - 2) * PICKER_ITEM_HEIGHT,
            index * PICKER_ITEM_HEIGHT,
            (index + 2) * PICKER_ITEM_HEIGHT,
          ],
          [inactiveScale, PICKER_SELECTED_SCALE, inactiveScale],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      scrollY.value,
      [
        (index - 1) * PICKER_ITEM_HEIGHT,
        index * PICKER_ITEM_HEIGHT,
        (index + 1) * PICKER_ITEM_HEIGHT,
      ],
      [itemColor, selectedItemColor, itemColor],
    ),
  }));

  return (
    <Animated.View style={[styles.pickerItem, animatedStyle]}>
      <Animated.Text
        key={`reusable-picker-list-item-${itemFontFamily ?? "system"}-${selectedItemFontWeight}`}
        style={[
          styles.pickerItemText,
          {
            fontSize: selectedItemFontSize,
            ...(textFontStyle as TextStyle),
          } satisfies TextStyle,
          animatedTextStyle,
        ]}
      >
        {value}
      </Animated.Text>
    </Animated.View>
  );
}

export type ReusablePickerPrimitiveProps = {
  min?: number;
  max?: number;
  value?: number;
  valueSuffix?: string;
  onChange?: (value: number) => void;
  disableInteractionState?: boolean;
  layoutFontFamily?: string;
  selectorBg?: string;
  selectorBorderColor?: string;
  selectorBorderRadius?: number;
  selectorBorderWidth?: number;
  selectorHeight?: number;
  selectorPaddingHorizontal?: number;
  selectorPaddingVertical?: number;
  selectorLabel?: string;
  selectorLabelColor?: string;
  selectorLabelFontSize?: number;
  selectorLabelFontFamily?: string;
  selectorLabelFontWeight?: string;
  selectorValueColor?: string;
  selectorValueFontSize?: number;
  selectorValueFontFamily?: string;
  selectorValueFontWeight?: string;
  selectorChevronColor?: string;
  selectorChevronSize?: number;
  sheetBg?: ComponentBg;
  sheetTitle?: string;
  sheetTitleColor?: string;
  sheetAccessory?: React.ReactNode;
  sheetRadius?: number;
  sheetHandleColor?: string;
  backdropColor?: string;
  selectedItemColor?: string;
  itemColor?: string;
  itemFontSize?: number;
  selectedItemFontSize?: number;
  itemFontFamily?: string;
  itemFontWeight?: string;
  selectedItemFontWeight?: string;
  actionText?: string;
  actionBg?: string;
  actionColor?: string;
  actionRadius?: number;
  actionFontSize?: number;
  actionFontFamily?: string;
  actionFontWeight?: string;
  doneText?: string;
  doneBg?: string;
  doneColor?: string;
  doneRadius?: number;
};

export function ReusablePickerPrimitive({
  min = 0,
  max = 120,
  value,
  valueSuffix = "years",
  onChange,
  disableInteractionState,
  layoutFontFamily,
  selectorBg,
  selectorBorderColor,
  selectorBorderRadius,
  selectorBorderWidth,
  selectorHeight,
  selectorPaddingHorizontal,
  selectorPaddingVertical,
  selectorLabel,
  selectorLabelColor,
  selectorLabelFontSize,
  selectorLabelFontFamily,
  selectorLabelFontWeight,
  selectorValueColor,
  selectorValueFontSize,
  selectorValueFontFamily,
  selectorValueFontWeight,
  selectorChevronColor,
  selectorChevronSize,
  sheetBg,
  sheetTitle = "Select your age",
  sheetTitleColor,
  sheetAccessory,
  sheetRadius,
  sheetHandleColor,
  backdropColor,
  selectedItemColor = "#F3F5F8",
  itemColor = "#64748B",
  itemFontSize = 24,
  selectedItemFontSize = 34,
  itemFontFamily,
  itemFontWeight = "700",
  selectedItemFontWeight = "800",
  actionText,
  actionBg,
  actionColor,
  actionRadius,
  actionFontSize = 16,
  actionFontFamily,
  actionFontWeight = "800",
  doneText,
  doneBg,
  doneColor,
  doneRadius,
}: ReusablePickerPrimitiveProps) {
  const values = useMemo(() => {
    const start = Math.max(0, Math.floor(min));
    const end = Math.max(start, Math.floor(max));
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [max, min]);
  const initialValue = value ?? values[Math.floor(values.length / 2)] ?? 30;
  const resolvedSelectorLabelFontFamily = resolveFontFamilyOverride(
    selectorLabelFontFamily,
    layoutFontFamily,
  );
  const resolvedSelectorValueFontFamily = resolveFontFamilyOverride(
    selectorValueFontFamily,
    layoutFontFamily,
  );
  const resolvedItemFontFamily = resolveFontFamilyOverride(
    itemFontFamily,
    layoutFontFamily,
  );
  const resolvedActionFontFamily = resolveFontFamilyOverride(
    actionFontFamily,
    layoutFontFamily,
  );
  const [open, setOpen] = useState(false);
  const listRef = useRef<FlatList<number>>(null);
  const selectedValueRef = useRef(initialValue);
  const draftValueRef = useRef(initialValue);
  const scrollY = useSharedValue(
    Math.max(0, values.indexOf(initialValue)) * PICKER_ITEM_HEIGHT,
  );
  const currentIndex = useSharedValue(Math.max(0, values.indexOf(initialValue)));
  const [committedValue, setCommittedValue] = useState(initialValue);

  useEffect(() => {
    selectedValueRef.current = initialValue;
    draftValueRef.current = initialValue;
    setCommittedValue(initialValue);
    const selectedIndex = Math.max(0, values.indexOf(initialValue));
    currentIndex.value = selectedIndex;
    scrollY.value = selectedIndex * PICKER_ITEM_HEIGHT;
  }, [currentIndex, initialValue, scrollY, values]);

  const updateDraftValueRef = useCallback(
    (index: number) => {
      const nextValue = values[Math.max(0, Math.min(values.length - 1, index))];
      if (typeof nextValue === "number") {
        draftValueRef.current = nextValue;
      }
    },
    [values],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const selectedValue = selectedValueRef.current;
    draftValueRef.current = selectedValue;
    const selectedIndex = Math.max(0, values.indexOf(selectedValue));
    currentIndex.value = selectedIndex;
    scrollY.value = selectedIndex * PICKER_ITEM_HEIGHT;
    const id = setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: false,
      });
    }, 0);
    return () => clearTimeout(id);
  }, [currentIndex, open, scrollY, values]);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      const nextIndex = Math.round(event.contentOffset.y / PICKER_ITEM_HEIGHT);
      if (nextIndex !== currentIndex.value) {
        currentIndex.value = nextIndex;
        scheduleOnRN(updateDraftValueRef, nextIndex);
      }
    }
  });

  const renderPickerItem = useCallback<ListRenderItem<number>>(
    ({ item, index }) => (
      <ReusablePickerListItem
        value={item}
        index={index}
        scrollY={scrollY}
        selectedItemColor={selectedItemColor}
        itemColor={itemColor}
        itemFontSize={itemFontSize}
        selectedItemFontSize={selectedItemFontSize}
        itemFontFamily={resolvedItemFontFamily}
        selectedItemFontWeight={selectedItemFontWeight}
      />
    ),
    [
      itemColor,
      itemFontSize,
      itemFontWeight,
      resolvedItemFontFamily,
      scrollY,
      selectedItemColor,
      selectedItemFontSize,
      selectedItemFontWeight,
    ],
  );

  return (
    <>
      <ReusablePickerSelectorPrimitive
        value={committedValue}
        valueSuffix={valueSuffix}
        disabled={disableInteractionState}
        selectorBg={selectorBg}
        selectorBorderColor={selectorBorderColor}
        selectorBorderRadius={selectorBorderRadius}
        selectorBorderWidth={selectorBorderWidth}
        selectorHeight={selectorHeight}
        selectorPaddingHorizontal={selectorPaddingHorizontal}
        selectorPaddingVertical={selectorPaddingVertical}
        selectorLabel={selectorLabel}
        selectorLabelColor={selectorLabelColor}
        selectorLabelFontSize={selectorLabelFontSize}
        selectorLabelFontFamily={resolvedSelectorLabelFontFamily}
        selectorLabelFontWeight={selectorLabelFontWeight}
        selectorValueColor={selectorValueColor}
        selectorValueFontSize={selectorValueFontSize}
        selectorValueFontFamily={resolvedSelectorValueFontFamily}
        selectorValueFontWeight={selectorValueFontWeight}
        selectorChevronColor={selectorChevronColor}
        selectorChevronSize={selectorChevronSize}
        onPress={() => setOpen(true)}
      />
      <BottomSheetPrimitive
        open={open}
        title={sheetTitle}
        sheetBg={sheetBg}
        sheetTitleColor={sheetTitleColor}
        sheetTitleFontFamily={layoutFontFamily}
        sheetAccessory={sheetAccessory}
        sheetRadius={sheetRadius}
        sheetHandleColor={sheetHandleColor}
        backdropColor={backdropColor}
        onClose={() => setOpen(false)}
      >
        <View style={styles.pickerFrame}>
          <Animated.FlatList
            key={`reusable-picker-list-${resolvedItemFontFamily ?? "system"}-${itemFontWeight}:${selectedItemFontWeight}`}
            ref={listRef as React.Ref<FlatList<number>>}
            data={values}
            keyExtractor={(item) => String(item)}
            showsVerticalScrollIndicator={false}
            snapToInterval={PICKER_ITEM_HEIGHT}
            decelerationRate="fast"
            getItemLayout={(_, index) => ({
              length: PICKER_ITEM_HEIGHT,
              offset: PICKER_ITEM_HEIGHT * index,
              index,
            })}
            contentContainerStyle={styles.pickerListContent}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            initialNumToRender={PICKER_VISIBLE_ITEMS + 2}
            maxToRenderPerBatch={PICKER_VISIBLE_ITEMS + 2}
            windowSize={5}
            removeClippedSubviews
            extraData={`${resolvedItemFontFamily ?? ""}:${itemFontWeight}:${selectedItemFontWeight}:${itemFontSize}:${selectedItemFontSize}`}
            renderItem={renderPickerItem}
          />
        </View>
        <Pressable
          style={[
            styles.doneButton,
            {
              backgroundColor: actionBg ?? doneBg ?? "#A7F3D0",
              borderRadius: actionRadius ?? doneRadius ?? 16,
            },
          ]}
          onPress={() => {
            const nextValue = draftValueRef.current;
            selectedValueRef.current = nextValue;
            setCommittedValue(nextValue);
            onChange?.(nextValue);
            setOpen(false);
          }}
        >
          <Text
            color={actionColor ?? doneColor ?? "#061A16"}
            fontSize={actionFontSize}
            {...resolveTextFontStyle({
              fontFamily: resolvedActionFontFamily,
              fontWeight: actionFontWeight as OnbornFontWeight,
            })}
          >
            {actionText ?? doneText ?? "Done"}
          </Text>
        </Pressable>
      </BottomSheetPrimitive>
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
  },
  sheet: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    alignItems: "center",
    gap: 18,
  },
  sheetHeader: {
    width: "100%",
    alignItems: "center",
    gap: 12,
    paddingBottom: 2,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
  },
  pickerFrame: {
    width: "100%",
    height: PICKER_HEIGHT,
    overflow: "hidden",
    justifyContent: "center",
  },
  pickerListContent: {
    paddingVertical: PICKER_ITEM_HEIGHT * 2,
  },
  pickerItem: {
    height: PICKER_ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerItemText: {
    textAlign: "center",
  },
  doneButton: {
    width: "100%",
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
});
