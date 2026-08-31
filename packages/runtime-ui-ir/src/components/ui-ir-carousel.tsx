import {
  Children,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  uiIrCarouselNextPage,
  uiIrCarouselPageAt,
} from "../domain/ui-ir-carousel";
import { registerCarouselAdvance } from "./ui-ir-carousel-advance";
import { useUiIrPreviewEditing } from "./use-ui-ir-preview-editing";

/**
 * A swipeable strip of full-width pages, one per child.
 *
 * The same component a screen imports and the renderer instantiates from a
 * `carousel` node, so what an author type-checks against is what runs. The
 * page width is measured here because it is only knowable here: a published
 * screen may not read the device size, and a page that is not exactly one
 * viewport wide is the whole difference between a carousel and a list that
 * happens to scroll sideways.
 */
export function UiIrCarousel(props: {
  children: ReactNode;
  /** Page dots under the strip. Defaults to on. */
  showsIndicator?: boolean;
  /*
   * How the dots look, so a recreation can match its reference's indicator —
   * an elongated active pill, tighter spacing, a brand colour — instead of
   * shipping the same generic dots on every screen. Flat, because these are
   * the attributes a screen writes in JSX and the compiler reads; absent
   * fields keep the defaults. The dot's radius follows its height, so a
   * widened active dot reads as a pill without any extra field.
   */
  /** Dot diameter. */
  indicatorSize?: number;
  /** Gap between dots. */
  indicatorSpacing?: number;
  /** Inactive dot fill. */
  indicatorColor?: string;
  /** Active dot fill. Defaults to the inactive fill at full opacity. */
  indicatorActiveColor?: string;
  /** Active dot width when the reference elongates it into a pill. */
  indicatorActiveWidth?: number;
  /** Which edge the dots sit on. Defaults to the bottom. */
  indicatorPlacement?: "top" | "bottom";
  /** Advances on its own every N milliseconds when set. */
  autoAdvanceMs?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}): ReactElement {
  const pages = Children.toArray(props.children);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollView | null>(null);
  /*
   * Held still while the canvas is in edit mode. A slide that walks away
   * mid-edit makes styling the one you are looking at impossible; the person
   * can swipe to the next page themselves when they want to work on it.
   */
  const editing = useUiIrPreviewEditing();
  const windowWidth = useWindowDimensions().width;
  const autoAdvanceMs = editing ? undefined : props.autoAdvanceMs;

  useEffect(() => {
    if (!autoAdvanceMs || pages.length < 2 || box.width <= 0) return;
    const timer = setTimeout(() => {
      const next = uiIrCarouselNextPage(page, pages.length);
      scroller.current?.scrollTo({ x: next * box.width, animated: true });
      // Set here rather than waiting for the scroll to settle: an animated
      // programmatic scroll does not always report momentum, and a dot that
      // lags a page behind reads as a bug.
      setPage(next);
    }, autoAdvanceMs);
    return () => clearTimeout(timer);
  }, [autoAdvanceMs, box.width, page, pages.length]);

  /*
   * Registered for the screen's Continue button, which lives outside the
   * strip. Refs, because the registration must stay stable across renders
   * while page and width move under it.
   */
  const pageRef = useRef(page);
  pageRef.current = page;
  const boxRef = useRef(box);
  boxRef.current = box;
  const countRef = useRef(pages.length);
  countRef.current = pages.length;
  useEffect(
    () =>
      registerCarouselAdvance(() => {
        const current = pageRef.current;
        if (current >= countRef.current - 1 || boxRef.current.width <= 0) {
          return false;
        }
        const next = current + 1;
        scroller.current?.scrollTo({
          x: next * boxRef.current.width,
          animated: true,
        });
        setPage(next);
        return true;
      }),
    [],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    /*
     * A page is never wider than the window, whatever the measurement says.
     *
     * On the web the whole chain can be intrinsic: the strip sizes to its
     * content, the container to the strip, the parent to the container — so
     * the first layout pass reports pages × page-width, the next multiplies
     * it again, and one measured screen sized every slide, and the sibling
     * button below, to thirty-three million pixels. The window is the one
     * width in the chain that does not depend on the content, so it caps the
     * reading, and the capped value is pinned back onto the container as a
     * number — which ends the feedback loop in one pass. On device the
     * measured width is already at most the window and nothing changes.
     */
    const pageWidth = Math.min(width, windowWidth);
    if (pageWidth !== box.width || height !== box.height) {
      setBox({ width: pageWidth, height });
    }
  };

  const onScrollSettled = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(
      uiIrCarouselPageAt({
        offset: event.nativeEvent.contentOffset.x,
        pageWidth: box.width,
        pageCount: pages.length,
      }),
    );
  };

  return (
    <View
      {...(props.accessibilityLabel
        ? { accessibilityLabel: props.accessibilityLabel }
        : {})}
      onLayout={onLayout}
      /*
       * Stretched before the author's style, not after: a page is one
       * viewport wide by definition, so the strip must take its parent's
       * full width even inside alignItems: "center" — the layout that
       * otherwise leaves this container width-less and the measurement
       * circular. An author who really wants a narrower strip can still
       * say so; their style wins.
       */
      style={[
        styles.container,
        props.style,
        // Pinned as a number once known; see onLayout for why.
        box.width > 0 ? { width: box.width } : null,
      ]}
    >
      {box.width > 0 ? (
        <ScrollView
          horizontal
          onMomentumScrollEnd={onScrollSettled}
          pagingEnabled
          ref={scroller}
          showsHorizontalScrollIndicator={false}
          style={styles.strip}
        >
          {pages.map((child, index) => (
            <View
              key={index}
              style={{
                width: box.width,
                // Only once there is a height to hand down. A carousel the
                // author sized by its content measures zero on the first pass,
                // and forcing that onto the pages would collapse the strip to
                // nothing it could ever grow back from.
                ...(box.height > 0 ? { height: box.height } : {}),
              }}
            >
              {child}
            </View>
          ))}
        </ScrollView>
      ) : null}
      {props.showsIndicator !== false && pages.length > 1 ? (
        <View
          pointerEvents="none"
          style={[
            styles.dots,
            props.indicatorPlacement === "top" ? styles.dotsTop : styles.dotsBottom,
            props.indicatorSpacing === undefined
              ? null
              : { gap: props.indicatorSpacing },
          ]}
        >
          {pages.map((_child, index) => (
            <View key={index} style={dotStyle(props, index === page)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/*
 * The dots take the carousel's own `color`, the way the chart takes its stroke
 * from one. The default is two-tone — a light fill inside a dark ring — so an
 * unstyled indicator reads on both grounds it actually meets: plain white
 * disappeared into a cream welcome canvas (the dots were in the DOM and
 * invisible on the screen), and plain dark would disappear into the full-bleed
 * photograph the component was first built for.
 */
/**
 * One dot's style, from the most specific colour the author gave it.
 *
 * An explicit indicator colour carries its own active/inactive contrast, so
 * the legacy 0.4 dimming only applies when the contrast has nowhere else to
 * come from — dimming a deliberately chosen inactive colour would double the
 * de-emphasis and drift it off the reference it was matched against.
 */
function dotStyle(
  props: {
    indicatorSize?: number;
    indicatorColor?: string;
    indicatorActiveColor?: string;
    indicatorActiveWidth?: number;
    style?: StyleProp<ViewStyle>;
  },
  active: boolean,
): StyleProp<ViewStyle> {
  const size = props.indicatorSize ?? 6;
  const width =
    active && props.indicatorActiveWidth ? props.indicatorActiveWidth : size;
  const fill =
    (active
      ? (props.indicatorActiveColor ?? props.indicatorColor)
      : props.indicatorColor) ?? dotColor(props.style);
  const dimsInactive = !props.indicatorColor;
  return [
    { borderRadius: size / 2, height: size, width },
    fill ? { backgroundColor: fill } : styles.dotDefault,
    { opacity: active || !dimsInactive ? 1 : 0.4 },
  ];
}

function dotColor(style: StyleProp<ViewStyle>): string | null {
  const flattened = StyleSheet.flatten(style) as
    | { color?: unknown }
    | undefined;
  return typeof flattened?.color === "string" ? flattened.color : null;
}

const styles = StyleSheet.create({
  /*
   * Width pinned at both levels, because react-native-web resolves an
   * unconstrained horizontal ScrollView to its content's width: the strip
   * grew to pages × page-width, its parent followed on the next measure, and
   * three passes later one screen's carousel — and the button beside it —
   * was thirty-three million pixels wide. overflow hidden is the backstop
   * that keeps a mis-measured strip inside its own band either way.
   */
  container: { alignSelf: "stretch", overflow: "hidden", width: "100%" },
  strip: { flexGrow: 0, width: "100%" },
  dots: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
  },
  dotsBottom: { bottom: 16 },
  dotsTop: { top: 16 },
  dotDefault: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 0, 0, 0.45)",
    borderWidth: 1,
  },
});
