import { z } from "zod";

import {
  BuilderV2PhosphorIconExportNameSchema,
  BuilderV2PhosphorIconWeightSchema,
  type BuilderV2PhosphorIconWeight,
} from "./builder-v2-phosphor-icons";
import {
  BuilderV2UiIrEnterTransitionSchema,
  BuilderV2UiIrExitTransitionSchema,
  BuilderV2UiIrLayoutTransitionSchema,
} from "./builder-v2-ui-ir-motion";
import {
  BuilderV2UiIrPlanFieldSchema,
  BuilderV2UiIrPlanRefSchema,
} from "./builder-v2-ui-ir-billing";
import {
  BuilderV2UiIrConditionSchema,
  BuilderV2UiIrPressFeedbackSchema,
  type BuilderV2UiIrCondition,
  type BuilderV2UiIrPressFeedback,
} from "./builder-v2-ui-ir-interaction";
import {
  BuilderV2UiIrVectorPaintSchema,
  BuilderV2UiIrVectorScalarSchema,
  type BuilderV2UiIrVectorPaint,
  type BuilderV2UiIrVectorScalar,
} from "./builder-v2-ui-ir-vector";

export * from "./builder-v2-ui-ir-billing";
export * from "./builder-v2-ui-ir-motion";
export * from "./builder-v2-ui-ir-interaction";
export * from "./builder-v2-ui-ir-vector";
export * from "./builder-v2-ui-ir-variables";

const UiIrIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

const SourcePathSchema = z
  .string()
  .trim()
  .min(1)
  .max(320)
  .refine(
    (path) =>
      !path.startsWith("/") &&
      !path.includes("\\") &&
      path
        .split("/")
        .every(
          (segment) => segment !== "" && segment !== "." && segment !== "..",
        ),
    { message: "Source paths must be safe relative POSIX paths" },
  );

export type BuilderV2UiIrJsonValue =
  | string
  | number
  | boolean
  | null
  | BuilderV2UiIrJsonValue[]
  | { [key: string]: BuilderV2UiIrJsonValue };

export const BuilderV2UiIrJsonValueSchema: z.ZodType<BuilderV2UiIrJsonValue> =
  z.lazy(() =>
    z.union([
      z.string().max(8_192),
      z.number().finite(),
      z.boolean(),
      z.null(),
      z.array(BuilderV2UiIrJsonValueSchema).max(256),
      z.record(z.string().min(1).max(120), BuilderV2UiIrJsonValueSchema),
    ]),
  );

/**
 * A Reanimated CSS animation, as the style keys that declare it.
 *
 * This is the artifact's loop. Entering and exiting transitions run once; a
 * pulsing call to action, a breathing hero, an idle waveform need motion that
 * repeats, and the only way to say that in the artifact is data — which is
 * exactly what Reanimated 4's CSS animations are: keyframes and timing in the
 * style object, applied by the runtime on an Animated component. Bounded so a
 * screen cannot declare a ten-second loop on every element.
 */
const CssDurationSchema = z
  .string()
  .regex(/^\d+(\.\d+)?(ms|s)$/, 'a CSS duration like "600ms" or "1.2s"');

/*
 * Only the two properties the GPU composites for free. Anything else in a
 * keyframe — width, height, margin, padding, flex, top — re-runs layout for
 * the node and its siblings on every frame of every iteration, which is a
 * loop that stutters on a mid-range Android forever. A one-off entrance can
 * afford a layout pass; something marked "infinite" cannot, so the artifact
 * refuses to carry it rather than trusting every author to know this.
 */
const CssKeyframeSchema = z
  .object({
    transform: BuilderV2UiIrJsonValueSchema.optional(),
    opacity: z.number().min(0).max(1).optional(),
  })
  .strict(
    "keyframes may only animate transform and opacity — anything else re-runs layout every frame and stutters; move the property into the base style or redesign the loop around scale/translate/opacity",
  );

/*
 * The built-ins plus cubic-bezier, minus ease-in. A UI element easing in
 * starts slow and delays exactly the moment the viewer is watching; every
 * use of it in a screen was a mistake nobody would defend, so the contract
 * stopped accepting it rather than the review having to catch it.
 */
const CssTimingFunctionSchema = z.union([
  z.enum(["linear", "ease", "ease-out", "ease-in-out"]),
  z
    .string()
    .regex(
      /^cubic-bezier\(\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*\)$/,
      'a timing function like "ease-out" or "cubic-bezier(0.23, 1, 0.32, 1)"',
    ),
]);

export const BuilderV2UiIrCssAnimationKeysSchema = z
  .object({
    animationName: z.record(
      z.string().regex(/^(from|to|\d{1,3}%)$/),
      CssKeyframeSchema,
    ),
    animationDuration: CssDurationSchema.optional(),
    animationDelay: CssDurationSchema.optional(),
    animationIterationCount: z
      .union([z.number().int().min(1).max(20), z.literal("infinite")])
      .optional(),
    animationDirection: z
      .enum(["normal", "reverse", "alternate", "alternate-reverse"])
      .optional(),
    animationTimingFunction: CssTimingFunctionSchema.optional(),
    animationFillMode: z
      .enum(["none", "forwards", "backwards", "both"])
      .optional(),
  })
  .partial()
  .passthrough();

/**
 * A Reanimated CSS transition: the style keys that make a state change move.
 *
 * A quiz card's border used to jump from grey to red the instant it was
 * selected; its press already animated, its selection did not. These keys on
 * the base style make every later change of the named properties — from a
 * variant, from a press — interpolate instead. Durations may be numbers
 * (milliseconds) so they can be read straight from theme.motion.
 */
const CssTransitionDurationSchema = z.union([
  z.number().int().min(0).max(10_000),
  CssDurationSchema,
]);

export const BuilderV2UiIrCssTransitionKeysSchema = z
  .object({
    transitionProperty: z.union([
      z.string().min(1).max(60),
      z.array(z.string().min(1).max(60)).min(1).max(12),
    ]),
    transitionDuration: CssTransitionDurationSchema.optional(),
    transitionDelay: CssTransitionDurationSchema.optional(),
    transitionTimingFunction: CssTimingFunctionSchema.optional(),
  })
  .partial()
  .passthrough();

export const BuilderV2UiIrStyleSchema = z
  .record(z.string().min(1).max(120), BuilderV2UiIrJsonValueSchema)
  .superRefine((style, context) => {
    if (Object.keys(style).length > 160) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A UI IR style cannot contain more than 160 properties",
      });
    }
    if ("transitionProperty" in style) {
      const parsed = BuilderV2UiIrCssTransitionKeysSchema.safeParse(style);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: issue.path,
            message: `CSS transition: ${issue.message}`,
          });
        }
      }
    }
    /*
     * Checked only when the style declares an animation, so every other style
     * is exactly as permissive as before. A malformed animation used to pass
     * the record and then do nothing at runtime.
     */
    if ("animationName" in style) {
      const parsed = BuilderV2UiIrCssAnimationKeysSchema.safeParse(style);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: issue.path,
            message: `CSS animation: ${issue.message}`,
          });
        }
      }
      const keyframes = Object.keys(
        (style.animationName as Record<string, unknown>) ?? {},
      );
      if (keyframes.length > 8) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["animationName"],
          message: "CSS animation: at most 8 keyframes",
        });
      }
    }
  });

export const BuilderV2UiIrSourceRefSchema = z
  .object({
    file: SourcePathSchema,
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
  })
  .strict()
  .refine((range) => range.end > range.start, {
    message: "Source range end must be greater than start",
    path: ["end"],
  });

export const BuilderV2UiIrTextSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("literal"),
      value: z.string().max(32_000),
    })
    .strict(),
  z
    .object({
      kind: z.literal("localized"),
      key: z.string().trim().min(1).max(240),
      fallback: z.string().max(32_000),
    })
    .strict(),
  /**
   * A value from the loaded offering: the price, the period, the trial.
   *
   * Deliberately carries no fallback. A price the device has not loaded is a
   * price nobody knows, and the one thing a paywall must never do is show a
   * number that is not the one being charged — so it renders as nothing, and
   * the block around it is gated on the plan existing.
   */
  z
    .object({
      kind: z.literal("billing"),
      plan: BuilderV2UiIrPlanRefSchema,
      field: BuilderV2UiIrPlanFieldSchema,
    })
    .strict(),
]);

export const BuilderV2UiIrActionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("state.set"),
      state: z.string().trim().min(1).max(80),
      value: z.union([z.string().max(240), z.null()]),
    })
    .strict(),
  /**
   * Page the screen's carousel forward; from the last slide, run `atEnd`.
   *
   * The Continue button of a paged welcome does both jobs — the references
   * advance the slides until the last one, and only then leave the screen —
   * and without this the two behaviours could not share one button. `atEnd`
   * is deliberately just navigation: the end of a pager is a place in the
   * journey, not a purchase or a link.
   */
  z
    .object({
      type: z.literal("carousel.advance"),
      atEnd: z
        .object({
          type: z.enum([
            "navigation.next",
            "navigation.complete",
            "navigation.back",
          ]),
        })
        .strict(),
    })
    .strict(),
  z.object({ type: z.literal("navigation.next") }).strict(),
  z.object({ type: z.literal("navigation.back") }).strict(),
  z.object({ type: z.literal("navigation.complete") }).strict(),
  z
    .object({
      type: z.literal("paywall.open"),
      placement: z.string().trim().min(1).max(120),
    })
    .strict(),
  /**
   * Buy something the person chose.
   *
   * The source is a nested union rather than three optional fields so that
   * "exactly one way of naming the purchase" is the schema's job and not a
   * refinement every reader has to remember. `packageId` is a fixed product,
   * `plan` a position in the offering, and `planFromState` the plan the screen
   * has selected — the only one of the three a real multi-plan paywall uses.
   */
  z
    .object({
      type: z.literal("billing.purchase"),
      source: z.union([
        z.object({ packageId: z.string().trim().min(1).max(160) }).strict(),
        z.object({ plan: BuilderV2UiIrPlanRefSchema }).strict(),
        z.object({ planFromState: z.string().trim().min(1).max(80) }).strict(),
      ]),
    })
    .strict(),
  z.object({ type: z.literal("billing.restore") }).strict(),
  /**
   * Open a URL outside the flow — the terms of service and the privacy policy
   * every paywall is required to link, which the dialect could not express at
   * all. The URL is resolved from the project manifest at publish time, so the
   * artifact still carries a static string and the address stays editable
   * without touching a screen.
   */
  z
    .object({
      type: z.literal("link.open"),
      url: z.string().trim().url().max(2_048),
    })
    .strict(),
  z.object({ type: z.literal("paywall.dismiss") }).strict(),
  z
    .object({
      type: z.literal("analytics.track"),
      event: z.string().trim().min(1).max(120),
      properties: z
        .record(z.string().min(1).max(120), BuilderV2UiIrJsonValueSchema)
        .optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("capability.invoke"),
      capability: z.string().trim().min(1).max(120),
      method: z.string().trim().min(1).max(120),
      input: BuilderV2UiIrJsonValueSchema.optional(),
      /**
       * What follows once the host has answered — `await runtime.actions.save()`
       * and then `runtime.navigation.continue()`. Only navigation: the step
       * after a host call is a place in the journey, and the button stays
       * busy until the call settles, so a failed call leaves the person where
       * they were.
       */
      then: z
        .object({
          type: z.enum([
            "navigation.next",
            "navigation.complete",
            "navigation.back",
          ]),
        })
        .strict()
        .optional(),
    })
    .strict(),
]);

type NodeBase = {
  id: string;
  style?: Record<string, BuilderV2UiIrJsonValue>;
  /** Merged over `style`, in order, while their condition holds. */
  variants?: Array<{
    when: BuilderV2UiIrCondition;
    style: Record<string, BuilderV2UiIrJsonValue>;
  }>;
  /** The node renders only while this holds. Absent means always. */
  presence?: BuilderV2UiIrCondition;
  /** Reported as accessibilityState.selected while this holds. */
  accessibilitySelected?: BuilderV2UiIrCondition;
  source?: z.infer<typeof BuilderV2UiIrSourceRefSchema>;
  /**
   * What a screen reader announces for this node.
   *
   * The same shape as visible text, and for the same reason: an accessibility
   * label is user-facing copy. It was a plain string, which made a localized
   * label impossible to express — the guidance asks for both a label on every
   * interactive element and every user-facing string to come from the locale
   * resources, and no code could satisfy both.
   */
  accessibilityLabel?: z.infer<typeof BuilderV2UiIrTextSchema>;
};

export type BuilderV2UiIrNode =
  | (NodeBase & {
      type: "view" | "safe-area-view" | "scroll-view";
      enterTransition?: z.infer<typeof BuilderV2UiIrEnterTransitionSchema>;
      exitTransition?: z.infer<typeof BuilderV2UiIrExitTransitionSchema>;
      layoutTransition?: z.infer<typeof BuilderV2UiIrLayoutTransitionSchema>;
      children: BuilderV2UiIrNode[];
    })
  | (NodeBase & {
      type: "text";
      text: z.infer<typeof BuilderV2UiIrTextSchema>;
    })
  | (NodeBase & {
      type: "image";
      assetId: string;
      resizeMode?: "cover" | "contain" | "stretch" | "center";
    })
  | (NodeBase & {
      type: "image-background";
      assetId: string;
      resizeMode?: "cover" | "contain" | "stretch" | "center";
      children: BuilderV2UiIrNode[];
    })
  /*
   * A colour ramp painted behind its children.
   *
   * The fade under the copy of every photographic hero, the tinted canvas of
   * a welcome — the dialect could name neither, so screens faked them with a
   * half-transparent View and the review saw a hard band where the reference
   * had a gradient. The stops are ordinary theme colours (an alpha stop is a
   * `#RRGGBBAA` custom token), `locations` place them along the axis, and
   * `start`/`end` are fractions of the box exactly as expo-linear-gradient
   * reads them, so a screen writes the component it already knows.
   */
  | (NodeBase & {
      type: "linear-gradient";
      colors: string[];
      locations?: number[];
      start?: { x: number; y: number };
      end?: { x: number; y: number };
      children: BuilderV2UiIrNode[];
    })
  /*
   * A vector animation the artifact carries.
   *
   * `assetId` names an entry in the document's `lottie` list, where the
   * animation JSON itself travels — inline, because the artifact is one
   * signed document and a generated animation is tens of kilobytes, not a
   * file worth a second delivery path. The host lends the player: a flow
   * that uses this compiles to a "lottie" requirement, and a host that has
   * not lent one is incompatible rather than silently blank.
   */
  | (NodeBase & {
      type: "lottie";
      assetId: string;
      loop: boolean;
      speed?: number;
      resizeMode?: "cover" | "contain" | "center";
    })
  | (NodeBase & {
      type: "pressable";
      action: z.infer<typeof BuilderV2UiIrActionSchema>;
      disabled?: boolean | BuilderV2UiIrCondition;
      contentStyle?: Record<string, BuilderV2UiIrJsonValue>;
      /**
       * Merged over `style` while the press is held.
       *
       * A second static object rather than an expression, so the artifact stays
       * a description. `feedback` covers the motion an element performs —
       * shrinking, dimming, a haptic tap — and this covers the far more common
       * thing a designer asks for: a different background or border while held.
       * The dialect could express neither, so the ordinary React Native idiom
       * `style={({ pressed }) => [base, pressed && held]}` could not be
       * published at all.
       */
      pressedStyle?: Record<string, BuilderV2UiIrJsonValue>;
      feedback?: BuilderV2UiIrPressFeedback;
      children: BuilderV2UiIrNode[];
    })
  | (NodeBase & {
      type: "status-bar";
      barStyle?: "default" | "light-content" | "dark-content";
    })
  /**
   * Where the journey's chrome puts the current screen — its `{children}`.
   * Exactly one per chrome, none anywhere else.
   */
  | (NodeBase & { type: "screen-slot" })
  /*
   * A field the person types into, bound to one of the screen's states.
   *
   * The name question every onboarding opens with had no expression: the
   * dialect could hold a selection but not free text. The field writes the
   * state as it is typed, the state travels with the journey's answers, and
   * `{{state}}` in any later copy reads it back. `submit` is the keyboard's
   * return key — the same action a Continue button would carry.
   */
  | (NodeBase & {
      type: "text-input";
      state: string;
      placeholder?: BuilderV2UiIrText;
      placeholderTextColor?: string;
      keyboardType?:
        | "default"
        | "email-address"
        | "numeric"
        | "phone-pad"
        | "decimal-pad"
        | "url";
      autoCapitalize?: "none" | "sentences" | "words" | "characters";
      autoCorrect?: boolean;
      secureTextEntry?: boolean;
      multiline?: boolean;
      maxLength?: number;
      autoFocus?: boolean;
      returnKeyType?: "done" | "go" | "next" | "send";
      submit?: BuilderV2UiIrAction;
    })
  | (NodeBase & {
      type: "phosphor-icon";
      name: string;
      size?: number;
      color?: string;
      weight?: BuilderV2PhosphorIconWeight;
      mirrored?: boolean;
    })
  | (NodeBase & {
      type: "svg";
      width?: BuilderV2UiIrVectorScalar;
      height?: BuilderV2UiIrVectorScalar;
      viewBox: string;
      paint?: BuilderV2UiIrVectorPaint;
      children: BuilderV2UiIrNode[];
    })
  | (NodeBase & {
      type: "svg-group";
      paint?: BuilderV2UiIrVectorPaint;
      children: BuilderV2UiIrNode[];
    })
  | (NodeBase & {
      type: "svg-path";
      d: string;
      paint?: BuilderV2UiIrVectorPaint;
    })
  | (NodeBase & {
      type: "svg-circle";
      cx: BuilderV2UiIrVectorScalar;
      cy: BuilderV2UiIrVectorScalar;
      r: BuilderV2UiIrVectorScalar;
      paint?: BuilderV2UiIrVectorPaint;
    })
  | (NodeBase & {
      type: "capability";
      capability: string;
      component: string;
      props: BuilderV2UiIrJsonValue;
    })
  /*
   * A chart the SDK draws, from data the artifact carries.
   *
   * Every other route to a chart failed the "no host code" bar: a host
   * component means the flow only runs in an app that supplies one, and
   * hand-drawn SVG means the model computing axes and bar heights in source.
   * The series is static — it is onboarding copy, not live data — so the
   * artifact stays a description and the runtime does the arithmetic with the
   * react-native-svg it already ships.
   */
  | (NodeBase & {
      type: "chart";
      variant: "bar" | "line";
      series: Array<{ label?: string; value: number }>;
    })
  /*
   * A layer above the screen: a bottom sheet, a dialog, a picker.
   *
   * The dialect could describe a screen and nothing on top of one, so an age
   * or weight picker — a button that opens a sheet — had no expression at all.
   * It needs no new machinery: `presence` already gates a node on screen
   * state, which is exactly what "the sheet is open" means, and the sheet's
   * own look is ordinary layout written inside it.
   *
   * `dismiss` is required rather than optional. A sheet with no way back is
   * the one failure mode this node makes easy, and the platform's own back
   * gesture has to land somewhere.
   */
  | (NodeBase & {
      type: "modal";
      dismiss: z.infer<typeof BuilderV2UiIrActionSchema>;
      children: BuilderV2UiIrNode[];
    })
  /**
   * Repeats its children once per plan in the loaded offering.
   *
   * The only node whose child count is not known at publish time, and the
   * reason it is allowed: the collection is the offering, which the runtime
   * loads and the artifact merely names. Everything inside still describes —
   * a `{ current: true }` plan reference resolves to the plan being repeated,
   * exactly as a fixed slot resolves to a position.
   *
   * `limit` bounds it, so a document's worst-case size is still a number a
   * reviewer can read off the artifact.
   */
  | (NodeBase & {
      type: "billing-plans";
      limit: number;
      children: BuilderV2UiIrNode[];
    })
  /**
   * A horizontally paged strip of its children, one child per page.
   *
   * The most-asked-for onboarding screen in the world — full-bleed images the
   * person swipes through — had no way to be described. A screen may not read
   * the device size, so its author could not make a page exactly one viewport
   * wide, and the paging, the page dots and the auto-advance are all motion
   * driven by a gesture, which a document cannot express at all. Every attempt
   * therefore ended as runtime code the compiler rejected: "UI IR only accepts
   * statically serializable values", after the model had already written the
   * screen twice.
   *
   * So the artifact names the pattern and the runtime performs it. The page
   * width is measured on the device, which is also the only place it is known.
   */
  | (NodeBase & {
      type: "carousel";
      /** Page dots under the strip. */
      showsIndicator: boolean;
      /**
       * How the dots look, matched to the reference's indicator — dot size,
       * spacing, fills, and the widened active pill. Absent fields keep the
       * runtime defaults; the whole object absent is the generic indicator.
       */
      indicator?: {
        size?: number;
        spacing?: number;
        color?: string;
        activeColor?: string;
        activeWidth?: number;
        placement?: "top" | "bottom";
      };
      /** Advances on its own every N milliseconds when set. */
      autoAdvanceMs?: number;
      children: BuilderV2UiIrNode[];
    })
  /**
   * A segmented control whose selection slides between segments.
   *
   * The slide is interaction-driven motion, which the document cannot carry —
   * every authored switcher therefore degraded to two fills swapping colour.
   * The document names the segments and the state they select into; the
   * runtime owns the pill, its measurement and its movement.
   */
  /**
   * A progress bar wired to the journey.
   *
   * The bar every onboarding step carries was a View with a literal width per
   * screen — three files to edit when a step moved, and no way to animate
   * between them because each screen mounts fresh. The runtime knows the
   * position and the total, and remembers the last value across screens, so
   * the fill grows from where the previous step left it. `from` is where the
   * bar starts on the first step (many products open at 20%, not empty).
   */
  | (NodeBase & {
      type: "journey-progress";
      from?: number;
      fillStyle?: Record<string, BuilderV2UiIrJsonValue>;
    })
  /**
   * A ring that fills over a fixed time, with the percent counting up.
   *
   * The loading step every quiz onboarding has — "analyzing your answers",
   * a ring, 0% to 100%, and on by itself — needs a timer and a counter, which
   * a static document cannot express and a screen may not write. The runtime
   * drives the fill, the count and the orbiting dot over `durationMs`; the
   * screen that shows it usually leaves on its own (see the screen's
   * autoContinue), so the two durations are written to match.
   */
  /**
   * A video from the project's assets, playing on its own.
   *
   * Muted and autoplaying by default, because that is the only video a
   * browser will start without a gesture and the only kind an onboarding
   * wants — a fist bump, a looping product hero — never a player with
   * controls. The device plays it through the host's lent player; the web
   * draws a <video>.
   */
  | (NodeBase & {
      type: "video";
      assetId: string;
      resizeMode?: "cover" | "contain";
      /** Loops by default; false plays once and holds the last frame. */
      loop?: boolean;
      /** Muted by default; sound needs a gesture the node never gets. */
      muted?: boolean;
    })
  | (NodeBase & {
      type: "progress-ring";
      durationMs: number;
      size?: number;
      strokeWidth?: number;
      color: string;
      trackColor?: string;
      showsPercent?: boolean;
      textStyle?: Record<string, BuilderV2UiIrJsonValue>;
    })
  | (NodeBase & {
      type: "segmented-control";
      /** The screen state the selection is written to, as a slot string. */
      state: string;
      segments: Array<{ value: string; label: BuilderV2UiIrText }>;
      pillStyle?: BuilderV2UiIrStyle;
      labelStyle?: BuilderV2UiIrStyle;
      selectedLabelStyle?: BuilderV2UiIrStyle;
    })
  /**
   * A ruler the person drags to pick a number — weight, height, age.
   *
   * The commonest sheet in a fitness onboarding, and one the document could
   * not carry: the drag is a gesture, the snap is momentum, and the big
   * number follows the ticks under the pointer. The document names the range
   * and the state the reading is written to; the runtime owns the ticks, the
   * snap, the haptic per tick and the counting number. The reading lands in
   * the state as a decimal string, so copy can speak it back and analytics
   * reports it like any other answer.
   */
  | (NodeBase & {
      type: "ruler-picker";
      /** The screen state the reading is written to, as a decimal string. */
      state: string;
      min: number;
      max: number;
      step: number;
      /** Drawn after the number — "kg", "cm", "lbs". */
      unit?: string;
      /** Decimals the reading keeps; derived from the step when absent. */
      fractionDigits?: number;
      /** Every Nth tick is tall and labelled. Ten by default. */
      majorEvery?: number;
      /** A light haptic per tick; requires the haptics capability. */
      haptic?: boolean;
      tickColor?: string;
      majorTickColor?: string;
      indicatorColor?: string;
      valueStyle?: BuilderV2UiIrStyle;
      unitStyle?: BuilderV2UiIrStyle;
      tickLabelStyle?: BuilderV2UiIrStyle;
    })
  /**
   * The platform's switch as a view of one selection: on while the state
   * equals `onValue`, and a flip writes `onValue` or null. The platform
   * draws and animates it — React Native's Switch on a device,
   * react-native-web's in a browser — so a toggle never degrades to two
   * fills swapping colour.
   */
  | (NodeBase & {
      type: "switch";
      /** The screen state the switch is a view of. */
      state: string;
      /** The value the state holds while the switch is on. "on" by default. */
      onValue?: string;
      /** The track behind the thumb while on. */
      trackColor?: string;
      /** The track while off. */
      offTrackColor?: string;
      thumbColor?: string;
      /** A light haptic per flip; requires the haptics capability. */
      haptic?: boolean;
    });

/** A point in the gradient's box, as fractions of its width and height. */
const GradientPointSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  })
  .strict();

const CommonNodeSchema = z.object({
  id: UiIrIdSchema,
  style: BuilderV2UiIrStyleSchema.optional(),
  variants: z
    .array(
      z
        .object({
          when: BuilderV2UiIrConditionSchema,
          style: BuilderV2UiIrStyleSchema,
        })
        .strict(),
    )
    .max(8)
    .optional(),
  presence: BuilderV2UiIrConditionSchema.optional(),
  accessibilitySelected: BuilderV2UiIrConditionSchema.optional(),
  source: BuilderV2UiIrSourceRefSchema.optional(),
  accessibilityLabel: BuilderV2UiIrTextSchema.optional(),
});

export const BuilderV2UiIrNodeSchema: z.ZodType<BuilderV2UiIrNode> = z.lazy(
  () =>
    z.discriminatedUnion("type", [
      CommonNodeSchema.extend({
        type: z.literal("view"),
        enterTransition: BuilderV2UiIrEnterTransitionSchema.optional(),
        exitTransition: BuilderV2UiIrExitTransitionSchema.optional(),
        layoutTransition: BuilderV2UiIrLayoutTransitionSchema.optional(),
        children: z.array(BuilderV2UiIrNodeSchema).max(1_000),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("safe-area-view"),
        enterTransition: BuilderV2UiIrEnterTransitionSchema.optional(),
        exitTransition: BuilderV2UiIrExitTransitionSchema.optional(),
        layoutTransition: BuilderV2UiIrLayoutTransitionSchema.optional(),
        children: z.array(BuilderV2UiIrNodeSchema).max(1_000),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("scroll-view"),
        enterTransition: BuilderV2UiIrEnterTransitionSchema.optional(),
        exitTransition: BuilderV2UiIrExitTransitionSchema.optional(),
        layoutTransition: BuilderV2UiIrLayoutTransitionSchema.optional(),
        children: z.array(BuilderV2UiIrNodeSchema).max(1_000),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("text"),
        text: BuilderV2UiIrTextSchema,
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("image"),
        assetId: UiIrIdSchema,
        resizeMode: z
          .enum(["cover", "contain", "stretch", "center"])
          .optional(),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("image-background"),
        assetId: UiIrIdSchema,
        resizeMode: z
          .enum(["cover", "contain", "stretch", "center"])
          .optional(),
        children: z.array(BuilderV2UiIrNodeSchema).max(1_000),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("linear-gradient"),
        // Two stops make a ramp; past eight it is a picture, not a tint.
        colors: z.array(z.string().trim().min(1).max(80)).min(2).max(8),
        // One per colour, 0..1 along the axis; the compiler holds the pairing.
        locations: z.array(z.number().min(0).max(1)).min(2).max(8).optional(),
        start: GradientPointSchema.optional(),
        end: GradientPointSchema.optional(),
        children: z.array(BuilderV2UiIrNodeSchema).max(1_000),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("lottie"),
        assetId: UiIrIdSchema,
        loop: z.boolean(),
        speed: z.number().min(0.25).max(3).optional(),
        resizeMode: z.enum(["cover", "contain", "center"]).optional(),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("pressable"),
        action: BuilderV2UiIrActionSchema,
        disabled: z
          .union([z.boolean(), BuilderV2UiIrConditionSchema])
          .optional(),
        contentStyle: BuilderV2UiIrStyleSchema.optional(),
        pressedStyle: BuilderV2UiIrStyleSchema.optional(),
        feedback: BuilderV2UiIrPressFeedbackSchema.optional(),
        children: z.array(BuilderV2UiIrNodeSchema).max(1_000),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("status-bar"),
        barStyle: z
          .enum(["default", "light-content", "dark-content"])
          .optional(),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("screen-slot"),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("text-input"),
        state: z.string().trim().min(1).max(80),
        placeholder: BuilderV2UiIrTextSchema.optional(),
        placeholderTextColor: z.string().trim().min(1).max(120).optional(),
        keyboardType: z
          .enum([
            "default",
            "email-address",
            "numeric",
            "phone-pad",
            "decimal-pad",
            "url",
          ])
          .optional(),
        autoCapitalize: z
          .enum(["none", "sentences", "words", "characters"])
          .optional(),
        autoCorrect: z.boolean().optional(),
        secureTextEntry: z.boolean().optional(),
        multiline: z.boolean().optional(),
        // Long enough for an address, short enough that a field is not a page.
        maxLength: z.number().int().min(1).max(2_000).optional(),
        autoFocus: z.boolean().optional(),
        returnKeyType: z.enum(["done", "go", "next", "send"]).optional(),
        submit: BuilderV2UiIrActionSchema.optional(),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("phosphor-icon"),
        name: BuilderV2PhosphorIconExportNameSchema,
        size: z.number().finite().positive().max(512).optional(),
        color: z.string().trim().min(1).max(120).optional(),
        weight: BuilderV2PhosphorIconWeightSchema.optional(),
        mirrored: z.boolean().optional(),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("svg"),
        width: BuilderV2UiIrVectorScalarSchema.optional(),
        height: BuilderV2UiIrVectorScalarSchema.optional(),
        viewBox: z.string().trim().min(1).max(240),
        paint: BuilderV2UiIrVectorPaintSchema.optional(),
        children: z.array(BuilderV2UiIrNodeSchema).max(1_000),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("svg-group"),
        paint: BuilderV2UiIrVectorPaintSchema.optional(),
        children: z.array(BuilderV2UiIrNodeSchema).max(1_000),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("svg-path"),
        d: z.string().trim().min(1).max(32_000),
        paint: BuilderV2UiIrVectorPaintSchema.optional(),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("svg-circle"),
        cx: BuilderV2UiIrVectorScalarSchema,
        cy: BuilderV2UiIrVectorScalarSchema,
        r: BuilderV2UiIrVectorScalarSchema,
        paint: BuilderV2UiIrVectorPaintSchema.optional(),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("capability"),
        capability: z.string().trim().min(1).max(120),
        component: z.string().trim().min(1).max(120),
        props: BuilderV2UiIrJsonValueSchema,
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("chart"),
        variant: z.enum(["bar", "line"]),
        series: z
          .array(
            z
              .object({
                label: z.string().trim().min(1).max(40).optional(),
                value: z.number().finite(),
              })
              .strict(),
          )
          .min(1)
          .max(24),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("modal"),
        dismiss: BuilderV2UiIrActionSchema,
        children: z.array(BuilderV2UiIrNodeSchema).max(1_000),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("billing-plans"),
        limit: z.number().int().min(1).max(8),
        children: z.array(BuilderV2UiIrNodeSchema).max(1_000),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("carousel"),
        showsIndicator: z.boolean(),
        // Bounds mirror the compiler's: dots stay dots, and the widened
        // active pill stays an indicator rather than a progress bar.
        indicator: z
          .object({
            size: z.number().min(4).max(16).optional(),
            spacing: z.number().min(2).max(24).optional(),
            color: z.string().trim().min(1).max(80).optional(),
            activeColor: z.string().trim().min(1).max(80).optional(),
            activeWidth: z.number().min(4).max(64).optional(),
            placement: z.enum(["top", "bottom"]).optional(),
          })
          .strict()
          .optional(),
        // Bounded at both ends: below a second nobody can read the slide, and
        // past twenty the strip reads as static and the dots as decoration.
        autoAdvanceMs: z.number().int().min(1_000).max(20_000).optional(),
        children: z.array(BuilderV2UiIrNodeSchema).max(24),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("journey-progress"),
        from: z.number().min(0).max(1).optional(),
        fillStyle: BuilderV2UiIrStyleSchema.optional(),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("video"),
        assetId: z.string().trim().min(1).max(160),
        resizeMode: z.enum(["cover", "contain"]).optional(),
        loop: z.boolean().optional(),
        muted: z.boolean().optional(),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("progress-ring"),
        // Under 200ms nothing is seen filling; past 15s it is a spinner
        // pretending to be progress.
        durationMs: z.number().int().min(200).max(15000),
        size: z.number().finite().positive().max(512).optional(),
        strokeWidth: z.number().finite().positive().max(64).optional(),
        color: z.string().trim().min(1).max(120),
        trackColor: z.string().trim().min(1).max(120).optional(),
        showsPercent: z.boolean().optional(),
        textStyle: BuilderV2UiIrStyleSchema.optional(),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("segmented-control"),
        state: z.string().trim().min(1).max(80),
        // Two is the point of a switcher; past six it is a picker wearing the
        // wrong control.
        segments: z
          .array(
            z
              .object({
                value: z.string().max(240),
                label: BuilderV2UiIrTextSchema,
              })
              .strict(),
          )
          .min(2)
          .max(6),
        pillStyle: BuilderV2UiIrStyleSchema.optional(),
        labelStyle: BuilderV2UiIrStyleSchema.optional(),
        selectedLabelStyle: BuilderV2UiIrStyleSchema.optional(),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("ruler-picker"),
        state: z.string().trim().min(1).max(80),
        min: z.number().finite(),
        max: z.number().finite(),
        step: z.number().finite().positive(),
        unit: z.string().trim().max(12).optional(),
        fractionDigits: z.number().int().min(0).max(3).optional(),
        majorEvery: z.number().int().min(2).max(50).optional(),
        haptic: z.boolean().optional(),
        tickColor: z.string().trim().min(1).max(120).optional(),
        majorTickColor: z.string().trim().min(1).max(120).optional(),
        indicatorColor: z.string().trim().min(1).max(120).optional(),
        valueStyle: BuilderV2UiIrStyleSchema.optional(),
        unitStyle: BuilderV2UiIrStyleSchema.optional(),
        tickLabelStyle: BuilderV2UiIrStyleSchema.optional(),
      }).strict(),
      CommonNodeSchema.extend({
        type: z.literal("switch"),
        state: z.string().trim().min(1).max(80),
        onValue: z.string().trim().min(1).max(80).optional(),
        trackColor: z.string().trim().min(1).max(120).optional(),
        offTrackColor: z.string().trim().min(1).max(120).optional(),
        thumbColor: z.string().trim().min(1).max(120).optional(),
        haptic: z.boolean().optional(),
      }).strict(),
    ]),
);

export type BuilderV2UiIrStyle = z.infer<typeof BuilderV2UiIrStyleSchema>;
export type BuilderV2UiIrSourceRef = z.infer<
  typeof BuilderV2UiIrSourceRefSchema
>;
export type BuilderV2UiIrText = z.infer<typeof BuilderV2UiIrTextSchema>;
export type BuilderV2UiIrAction = z.infer<typeof BuilderV2UiIrActionSchema>;
