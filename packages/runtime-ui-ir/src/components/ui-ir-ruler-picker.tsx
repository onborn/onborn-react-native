import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import {
  uiIrRulerIndexAtOffset,
  uiIrRulerIndexOf,
  uiIrRulerStepCount,
  uiIrRulerValueAt,
} from "../domain/ui-ir-ruler";

const ITEM_WIDTH = 12;
const TICK_WIDTH = 1.5;
const SHORT_TICK = 18;
const MID_TICK = 28;
const LONG_TICK = 40;
const LABEL_HEIGHT = 24;
const RULER_HEIGHT = LONG_TICK + LABEL_HEIGHT + 12;
const LABEL_WIDTH = 56;
/*
 * How long the strip must be still before the reading is final. Native
 * reports momentum ending; the web does not always, and a reading that only
 * landed on the device would be a form that only submits on the device.
 */
const SETTLE_MS = 120;

type Tick = { index: number };

const keyExtractor = (tick: Tick) => String(tick.index);
const getItemLayout = (
  _: ArrayLike<Tick> | null | undefined,
  index: number,
) => ({
  length: ITEM_WIDTH,
  offset: ITEM_WIDTH * index,
  index,
});

/**
 * A ruler the person drags to pick a number.
 *
 * The same component a screen imports and the renderer instantiates from a
 * `ruler-picker` node. It exists because the drag cannot be authored: the
 * snap is momentum and the big number follows the tick under the indicator,
 * neither of which the published document can express. The reading is a
 * decimal string — what the screen's state stores and what copy speaks back.
 *
 * Wiring inside, visuals outside: tick colours, the indicator and the number's
 * type come from the caller; the defaults are placeholders, not a design.
 */
export function UiIrRulerPicker(props: {
  value: string | null;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  fractionDigits?: number;
  /** Every Nth tick is tall and labelled. Ten by default. */
  majorEvery?: number;
  tickColor?: string;
  majorTickColor?: string;
  indicatorColor?: string;
  style?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<TextStyle>;
  unitStyle?: StyleProp<TextStyle>;
  tickLabelStyle?: StyleProp<TextStyle>;
  /** Fired as the indicator crosses a tick; the host answers with a haptic. */
  onTick?: () => void;
  accessibilityLabel?: string;
  /** Canvas markers (react-native-web data attributes); see the harness. */
  dataSet?: Record<string, string>;
  slotDataSets?: {
    value?: Record<string, string>;
    unit?: Record<string, string>;
    tickLabel?: Record<string, string>;
  };
}): ReactElement {
  const range = useMemo(
    () => ({
      min: props.min,
      max: props.max,
      step: props.step,
      ...(props.fractionDigits !== undefined
        ? { fractionDigits: props.fractionDigits }
        : {}),
    }),
    [props.fractionDigits, props.max, props.min, props.step],
  );
  const count = uiIrRulerStepCount(range);
  const majorEvery = Math.max(2, Math.round(props.majorEvery ?? 10));
  const ticks = useMemo<Tick[]>(
    () => Array.from({ length: count + 1 }, (_, index) => ({ index })),
    [count],
  );

  const [trackWidth, setTrackWidth] = useState(0);
  const [index, setIndex] = useState(() =>
    uiIrRulerIndexOf(range, props.value),
  );
  const indexRef = useRef(index);
  const list = useRef<FlatList<Tick>>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  /*
   * Whether the strip has been put on its reading. Until then nothing it
   * reports is the person's doing: on the web the first placement landed
   * before the content was laid out, the browser clamped the offset to the
   * end, and the clamp was read as a drag — every sheet opened on the
   * ruler's maximum and wrote it into the answer.
   */
  const placed = useRef(false);
  const { onChange, onTick, value } = props;

  /*
   * A reading written from outside — the sheet reopened on a remembered
   * answer — moves the strip; a reading the strip itself just wrote does not,
   * or every settle would scroll a strip that is already there.
   */
  useEffect(() => {
    const target = uiIrRulerIndexOf(range, value);
    if (target === indexRef.current) return;
    indexRef.current = target;
    setIndex(target);
    if (!placed.current) return;
    list.current?.scrollToOffset({
      offset: target * ITEM_WIDTH,
      animated: false,
    });
  }, [range, value]);

  useEffect(
    () => () => {
      if (settle.current) clearTimeout(settle.current);
    },
    [],
  );

  const finalize = useCallback(
    (offset: number) => {
      if (!placed.current) return;
      const landed = uiIrRulerIndexAtOffset({
        offset,
        itemWidth: ITEM_WIDTH,
        count,
      });
      if (Math.abs(offset - landed * ITEM_WIDTH) > 0.5) {
        list.current?.scrollToOffset({
          offset: landed * ITEM_WIDTH,
          animated: true,
        });
      }
      if (landed !== indexRef.current) {
        indexRef.current = landed;
        setIndex(landed);
      }
      const reading = uiIrRulerValueAt(range, landed);
      if (reading !== value) onChange(reading);
    },
    [count, onChange, range, value],
  );

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!placed.current) return;
    const offset = event.nativeEvent.contentOffset.x;
    const under = uiIrRulerIndexAtOffset({
      offset,
      itemWidth: ITEM_WIDTH,
      count,
    });
    if (under !== indexRef.current) {
      indexRef.current = under;
      setIndex(under);
      onTick?.();
    }
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      settle.current = null;
      finalize(offset);
    }, SETTLE_MS);
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (settle.current) {
      clearTimeout(settle.current);
      settle.current = null;
    }
    finalize(event.nativeEvent.contentOffset.x);
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width !== trackWidth) setTrackWidth(width);
  };

  /*
   * Placed once the content is laid out, not through initialScrollIndex: a
   * list started at an index renders nothing before it until it is
   * scrolled, so half the strip sat empty on first open. Every tick is
   * rendered up front instead — a few hundred thin Views — and the strip is
   * moved to the reading the moment its content is wide enough to hold it.
   */
  const onContentSizeChange = (contentWidth: number) => {
    if (placed.current) return;
    const target = indexRef.current * ITEM_WIDTH;
    if (contentWidth < target + trackWidth) return;
    placed.current = true;
    list.current?.scrollToOffset({ offset: target, animated: false });
  };

  const sidePadding = Math.max(0, (trackWidth - ITEM_WIDTH) / 2);
  const tickColor = props.tickColor ?? "#C9C9CF";
  const majorTickColor = props.majorTickColor ?? "#1C1C1E";
  const indicatorColor = props.indicatorColor ?? "#E0426F";

  const renderTick = useCallback(
    ({ item }: { item: Tick }) => {
      const major = item.index % majorEvery === 0;
      const mid =
        !major && majorEvery % 2 === 0 && item.index % (majorEvery / 2) === 0;
      return (
        <View style={styles.tickCell}>
          {major ? (
            /*
             * Boxed, not clamped: a numberOfLines on the web caps the text at
             * its parent's width, and the parent is one tick wide, so every
             * label read "1…". The box is wide enough for the widest reading
             * and centred on the tick.
             */
            <View style={styles.tickLabelBox}>
              <Text
                {...marker(props.slotDataSets?.tickLabel)}
                style={[styles.tickLabel, props.tickLabelStyle]}
              >
                {uiIrRulerValueAt(range, item.index)}
              </Text>
            </View>
          ) : null}
          <View
            style={[
              styles.tick,
              {
                height: major ? LONG_TICK : mid ? MID_TICK : SHORT_TICK,
                backgroundColor: major ? majorTickColor : tickColor,
              },
            ]}
          />
        </View>
      );
    },
    [
      majorEvery,
      majorTickColor,
      props.slotDataSets?.tickLabel,
      props.tickLabelStyle,
      range,
      tickColor,
    ],
  );

  const reading = uiIrRulerValueAt(range, index);
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityValue={{
        min: props.min,
        max: props.max,
        now: Number(reading),
        text: props.unit ? `${reading} ${props.unit}` : reading,
      }}
      {...(props.accessibilityLabel
        ? { accessibilityLabel: props.accessibilityLabel }
        : {})}
      {...marker(props.dataSet)}
      style={[styles.container, props.style]}
    >
      <View style={styles.valueRow}>
        <Text
          {...marker(props.slotDataSets?.value)}
          style={[styles.value, props.valueStyle]}
        >
          {reading}
        </Text>
        {props.unit ? (
          <Text
            {...marker(props.slotDataSets?.unit)}
            style={[styles.unit, props.unitStyle]}
          >
            {props.unit}
          </Text>
        ) : null}
      </View>
      <View onLayout={onLayout} style={styles.track}>
        {trackWidth > 0 ? (
          <FlatList
            bounces={false}
            contentContainerStyle={{ paddingHorizontal: sidePadding }}
            data={ticks}
            decelerationRate="fast"
            getItemLayout={getItemLayout}
            horizontal
            initialNumToRender={ticks.length}
            keyExtractor={keyExtractor}
            onContentSizeChange={onContentSizeChange}
            onMomentumScrollEnd={onScrollEnd}
            onScroll={onScroll}
            onScrollEndDrag={onScrollEnd}
            overScrollMode="never"
            ref={list}
            renderItem={renderTick}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            snapToAlignment="start"
            snapToInterval={ITEM_WIDTH}
            /*
             * Pinned to the measured track, as a number: on the web a
             * horizontal strip left to size itself takes its content's width
             * — every tick of a 160-step ruler side by side — and a strip as
             * wide as its content has nothing to scroll.
             */
            style={[styles.strip, { width: trackWidth }]}
            windowSize={21}
          />
        ) : null}
        <View style={styles.indicator}>
          <View
            style={[styles.indicatorLine, { backgroundColor: indicatorColor }]}
          />
        </View>
      </View>
    </View>
  );
}

/*
 * react-native-web turns a dataSet prop into data-* attributes, which is how
 * the canvas finds a part to outline and restyle; native ignores it. Typed
 * loosely because React Native's own prop types do not know the prop.
 */
function marker(dataSet: Record<string, string> | undefined): object {
  return dataSet ? { dataSet } : {};
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
  },
  valueRow: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  value: {
    fontSize: 56,
    fontWeight: "700",
    lineHeight: 64,
    textAlign: "center",
  },
  unit: {
    fontSize: 20,
    marginLeft: 6,
    opacity: 0.6,
  },
  track: {
    alignSelf: "stretch",
    height: RULER_HEIGHT,
    position: "relative",
  },
  strip: {
    height: RULER_HEIGHT,
  },
  tickCell: {
    alignItems: "center",
    height: RULER_HEIGHT,
    justifyContent: "flex-end",
    paddingBottom: 12,
    width: ITEM_WIDTH,
  },
  tick: {
    borderRadius: 1,
    width: TICK_WIDTH,
  },
  tickLabelBox: {
    alignItems: "center",
    left: -(LABEL_WIDTH - ITEM_WIDTH) / 2,
    position: "absolute",
    top: 0,
    width: LABEL_WIDTH,
  },
  tickLabel: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
  },
  indicator: {
    alignItems: "center",
    bottom: 0,
    left: "50%",
    marginLeft: -6,
    pointerEvents: "none",
    position: "absolute",
    width: 12,
  },
  // A plain line over the ticks, the app's own marker; no arrowhead.
  indicatorLine: {
    height: LONG_TICK + 12,
    width: 2,
  },
});
