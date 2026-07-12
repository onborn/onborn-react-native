import { z } from "zod";
import { PHOSPHOR_ICON_NAMES } from "./phosphor-icons";

export const SlotSchema = z.enum(["top", "hero", "content", "bottom"]);

export const PrimitiveVisibilitySchema = z
  .object({
    mode: z.enum(["all", "include_steps", "exclude_steps"]),
    stepIds: z.array(z.string().trim().min(1)).optional(),
  })
  .strict();

/** A single gradient color stop; `position` is 0..1 along the gradient line. */
export const ComponentGradientStopSchema = z
  .object({
    color: z.string().trim().min(1),
    position: z.number().min(0).max(1).optional(),
  })
  .strict();

export const ComponentBgSchema = z.union([
  z.string(),
  z
    .object({
      type: z.literal("linear_gradient"),
      // A named preset (backward compatible) OR a custom gradient (angle + 2–4
      // stops). At least one of `preset`/`stops` should be present.
      preset: z.string().trim().min(1).optional(),
      angle: z.number().min(0).max(360).optional(),
      stops: z.array(ComponentGradientStopSchema).min(2).max(4).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("blur"),
      intensity: z.number().min(0).max(80).optional(),
      tintColor: z.string().trim().min(1).optional(),
      opacity: z.number().min(0).max(1).optional(),
    })
    .strict(),
]);

export const PrimitiveBaseSchema = z
  .object({
    slot: SlotSchema,
    order: z.number().int().nonnegative(),
    visible: z.boolean(),
  })
  .strict();

export const ImagePrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("image"),
  props: z
    .object({
      src: z.string().url().optional(),
      bucket: z.string().trim().min(1).optional(),
      path: z.string().trim().min(1).optional(),
      width: z.number().min(0).optional(),
      height: z.number().min(0).optional(),
      borderRadius: z.number().min(0).max(999).optional(),
      widthMode: z.enum(["card", "full"]).optional(),
      // "fixed" (default): use `height` (or a sensible default).
      // "aspect": derive height from width using `aspectRatio` (width / height).
      // Recommended for prominent edge-to-edge hero media.
      heightMode: z.enum(["fixed", "aspect"]).optional(),
      aspectRatio: z.number().min(0.2).max(5).optional(),
      resizeMode: z.enum(["cover", "contain"]).optional(),
      treatment: z.enum(["none", "dim", "soft", "cinematic"]).optional(),
      focalPointX: z.number().min(0).max(1).optional(),
      focalPointY: z.number().min(0).max(1).optional(),
      overlayColor: z.string().trim().min(1).optional(),
      overlayOpacity: z.number().min(0).max(1).optional(),
      blurRadius: z.number().min(0).max(40).optional(),
    })
    .strict(),
});

export const AnimatedAssetPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("animated_asset"),
  props: z
    .object({
      format: z.literal("lottie_json").optional(),
      src: z.string().url().optional(),
      bucket: z.string().trim().min(1).optional(),
      path: z.string().trim().min(1).optional(),
      fallbackSrc: z.string().url().optional(),
      fallbackBucket: z.string().trim().min(1).optional(),
      fallbackPath: z.string().trim().min(1).optional(),
      width: z.number().min(0).optional(),
      height: z.number().min(0).optional(),
      aspectRatio: z.number().min(0.1).max(10).optional(),
      borderRadius: z.number().min(0).max(999).optional(),
      widthMode: z.enum(["card", "full"]).optional(),
      resizeMode: z.enum(["cover", "contain"]).optional(),
      loop: z.boolean().optional(),
      autoplay: z.boolean().optional(),
      speed: z.number().min(0.1).max(4).optional(),
      playMode: z.enum(["normal", "bounce"]).optional(),
      bg: ComponentBgSchema.optional(),
    })
    .strict(),
});

export const TextFontFamilySchema = z.enum([
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Raleway",
  "Merriweather",
  "Nunito",
  "Playfair Display",
  "Space Grotesk",
  "Sora",
  "Oswald",
  "Fraunces",
]);

export const TextFontWeightSchema = z.enum([
  "normal",
  "400",
  "500",
  "600",
  "700",
  "800",
  "bold",
]);

export const TextLineHeightSchema = z.enum(["tight", "normal", "relaxed"]);
export const TextLetterSpacingSchema = z.number().min(-4).max(16);
export const TextFontSizeSchema = z.number().min(8).max(120);

export const TitleFontWeightSchema = TextFontWeightSchema;

export const PhosphorIconNameSchema = z.enum(PHOSPHOR_ICON_NAMES);

export const PhosphorIconWeightSchema = z.enum([
  "thin",
  "light",
  "regular",
  "bold",
  "fill",
  "duotone",
]);

export const TitlePrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("title"),
  props: z
    .object({
      text: z.string(),
      size: z.enum(["sm", "md", "lg", "xl", "display", "hero"]).optional(),
      align: z.enum(["left", "center", "right"]).optional(),
      color: z.string().optional(),
      fontFamily: TextFontFamilySchema.optional(),
      fontWeight: TitleFontWeightSchema.optional(),
      fontSize: TextFontSizeSchema.optional(),
      lineHeight: TextLineHeightSchema.optional(),
      letterSpacing: TextLetterSpacingSchema.optional(),
    })
    .strict(),
});

export const SubtitlePrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("subtitle"),
  props: z
    .object({
      text: z.string(),
      size: z.enum(["sm", "md", "lg"]).optional(),
      align: z.enum(["left", "center"]).optional(),
      color: z.string().optional(),
      fontFamily: TextFontFamilySchema.optional(),
      fontWeight: TextFontWeightSchema.optional(),
      fontSize: TextFontSizeSchema.optional(),
      lineHeight: TextLineHeightSchema.optional(),
      letterSpacing: TextLetterSpacingSchema.optional(),
    })
    .strict(),
});

export const ProgressBarPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("progress_bar"),
  props: z
    .object({
      variant: z.enum(["bar", "dots"]).optional(),
      value: z.number().min(0).max(100).optional(),
      height: z.number().min(2).max(48).optional(),
      borderRadius: z.number().min(0).max(999).optional(),
      indicatorBg: z.string().optional(),
      trackBg: z.string().optional(),
      dotSize: z.number().min(4).max(24).optional(),
      activeDotWidth: z.number().min(4).max(96).optional(),
      gap: z.number().min(0).max(32).optional(),
      align: z.enum(["left", "center", "right"]).optional(),
    })
    .strict(),
});

export const CTAButtonVariantSchema = z.enum([
  "primary",
  "secondary",
  "inverted",
  "outline",
  "custom",
]);
export const CTAButtonIconPositionSchema = z.enum(["left", "right"]);
export const CTAButtonActionSchema = z.enum([
  "next",
  "back",
  "skip",
  "purchase",
  "start_trial",
]);

export const CTAButtonPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("cta_button"),
  props: z
    .object({
      text: z.string(),
      action: CTAButtonActionSchema.optional(),
      variant: CTAButtonVariantSchema.optional(),
      fullWidth: z.boolean().optional(),
      bg: z.string().optional(),
      color: z.string().optional(),
      borderColor: z.string().optional(),
      borderWidth: z.number().min(0).max(12).optional(),
      borderRadius: z.number().min(0).max(999).optional(),
      fontFamily: TextFontFamilySchema.optional(),
      fontWeight: TextFontWeightSchema.optional(),
      fontSize: z.number().min(8).max(64).optional(),
      letterSpacing: TextLetterSpacingSchema.optional(),
      iconName: PhosphorIconNameSchema.optional(),
      iconPosition: CTAButtonIconPositionSchema.optional(),
      iconColor: z.string().optional(),
      iconSize: z.number().min(4).max(128).optional(),
      iconWeight: PhosphorIconWeightSchema.optional(),
    })
    .strict(),
});

export const InputPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("input"),
  props: z
    .object({
      id: z.string().trim().min(1).optional(),
      placeholder: z.string(),
      value: z.string().optional(),
      keyboardType: z.enum(["text", "email", "number"]).optional(),
      autoFocus: z.boolean().optional(),
      secureTextEntry: z.boolean().optional(),
      submitOnReturn: z.boolean().optional(),
      transparent: z.boolean().optional(),
      bg: z.string().optional(),
      color: z.string().optional(),
      placeholderColor: z.string().optional(),
      borderColor: z.string().optional(),
      borderWidth: z.number().min(0).max(12).optional(),
      borderRadius: z.number().min(0).max(999).optional(),
      height: z.number().min(0).max(240).optional(),
      paddingHorizontal: z.number().min(0).max(96).optional(),
      fontSize: z.number().min(8).max(64).optional(),
      fontFamily: TextFontFamilySchema.optional(),
      fontWeight: TextFontWeightSchema.optional(),
      lineHeight: TextLineHeightSchema.optional(),
    })
    .strict(),
});

export const TogglePrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("toggle"),
  props: z
    .object({
      id: z.string().trim().min(1).optional(),
      value: z.boolean().optional(),
      thumbColor: z.string().optional(),
      trackColor: z.string().optional(),
      activeThumbColor: z.string().optional(),
      activeTrackColor: z.string().optional(),
    })
    .strict(),
});

export const CarouselPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("carousel"),
  props: z
    .object({
      items: z.array(
        z
          .object({
            image: z.string().url().optional(),
            bucket: z.string().trim().min(1).optional(),
            path: z.string().trim().min(1).optional(),
            title: z.string().optional(),
            subtitle: z.string().optional(),
            text: z.string().optional(),
            name: z.string().optional(),
            role: z.string().optional(),
            rating: z.number().min(0).max(5).optional(),
          })
          .strict(),
      ),
      variant: z.enum(["media", "testimonial"]).optional(),
      itemHeight: z.number().min(80).max(600).optional(),
      borderRadius: z.number().min(0).max(999).optional(),
      widthMode: z.enum(["card", "full"]).optional(),
      cardBg: ComponentBgSchema.optional(),
      titleColor: z.string().optional(),
      subtitleColor: z.string().optional(),
      textColor: z.string().optional(),
      ratingColor: z.string().optional(),
      titleFontSize: z.number().min(8).max(64).optional(),
      subtitleFontSize: z.number().min(8).max(64).optional(),
      textFontSize: z.number().min(8).max(64).optional(),
      avatarSize: z.number().min(0).max(240).optional(),
      titleFontFamily: TextFontFamilySchema.optional(),
      subtitleFontFamily: TextFontFamilySchema.optional(),
      textFontFamily: TextFontFamilySchema.optional(),
      titleFontWeight: TextFontWeightSchema.optional(),
      subtitleFontWeight: TextFontWeightSchema.optional(),
      textFontWeight: TextFontWeightSchema.optional(),
      titleLineHeight: TextLineHeightSchema.optional(),
      subtitleLineHeight: TextLineHeightSchema.optional(),
      textLineHeight: TextLineHeightSchema.optional(),
    })
    .strict(),
});

export const CarouselPaginationPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("carousel_pagination"),
  props: z
    .object({
      count: z.number().int().min(1),
      activeColor: z.string().optional(),
      inactiveColor: z.string().optional(),
      dotSize: z.number().min(4).max(24).optional(),
      gap: z.number().min(0).max(32).optional(),
    })
    .strict(),
});

export const AvatarPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("avatar"),
  props: z
    .object({
      src: z.string().url().optional(),
      bucket: z.string().trim().min(1).optional(),
      path: z.string().trim().min(1).optional(),
      width: z.number().min(0).max(1200).optional(),
      height: z.number().min(0).max(1200).optional(),
      borderRadius: z.number().min(0).max(999).optional(),
    })
    .strict(),
});

export const BadgePrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("badge"),
  props: z
    .object({
      text: z.string(),
      bg: z.string().optional(),
      color: z.string().optional(),
      borderRadius: z.number().min(0).max(999).optional(),
      paddingHorizontal: z.number().min(0).max(96).optional(),
      paddingVertical: z.number().min(0).max(64).optional(),
      fontSize: z.number().min(8).max(64).optional(),
      fontFamily: TextFontFamilySchema.optional(),
      fontWeight: TextFontWeightSchema.optional(),
      lineHeight: TextLineHeightSchema.optional(),
      iconName: PhosphorIconNameSchema.optional(),
      iconColor: z.string().optional(),
      iconSize: z.number().min(4).max(128).optional(),
      iconWeight: PhosphorIconWeightSchema.optional(),
      iconGap: z.number().min(0).max(48).optional(),
    })
    .strict(),
});

export const BackButtonPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("back_button"),
  props: z
    .object({
      variant: z.enum(["icon", "icon_text"]).optional(),
      text: z.string().optional(),
      icon: z.enum(["caret-left", "arrow-left"]).optional(),
      bg: z.string().optional(),
      color: z.string().optional(),
      borderColor: z.string().optional(),
      borderWidth: z.number().min(0).max(12).optional(),
      borderRadius: z.number().min(0).max(999).optional(),
      paddingHorizontal: z.number().min(0).max(96).optional(),
      paddingVertical: z.number().min(0).max(64).optional(),
      iconSize: z.number().min(4).max(128).optional(),
      fontSize: z.number().min(8).max(64).optional(),
      fontFamily: TextFontFamilySchema.optional(),
      fontWeight: TextFontWeightSchema.optional(),
      lineHeight: TextLineHeightSchema.optional(),
    })
    .strict(),
});

export const SkipButtonVariantSchema = z.enum(["icon", "text", "icon_text"]);

export const SkipButtonPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("skip_button"),
  props: z
    .object({
      variant: SkipButtonVariantSchema.optional(),
      text: z.string().optional(),
      iconName: PhosphorIconNameSchema.optional(),
      iconPosition: CTAButtonIconPositionSchema.optional(),
      color: z.string().optional(),
      bg: z.string().optional(),
      borderColor: z.string().optional(),
      borderWidth: z.number().min(0).max(12).optional(),
      borderRadius: z.number().min(0).max(999).optional(),
      paddingHorizontal: z.number().min(0).max(96).optional(),
      paddingVertical: z.number().min(0).max(64).optional(),
      fontSize: z.number().min(8).max(64).optional(),
      fontFamily: TextFontFamilySchema.optional(),
      fontWeight: TextFontWeightSchema.optional(),
      lineHeight: TextLineHeightSchema.optional(),
      iconColor: z.string().optional(),
      iconSize: z.number().min(4).max(128).optional(),
      iconWeight: PhosphorIconWeightSchema.optional(),
    })
    .strict(),
});

export const IconPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("icon"),
  props: z
    .object({
      name: PhosphorIconNameSchema,
      color: z.string().optional(),
      size: z.number().min(4).max(256).optional(),
      weight: PhosphorIconWeightSchema.optional(),
    })
    .strict(),
});

const STACK_MAX_CHILDREN = 6;
const STACK_MAX_CENTER_CHILD_INDEX = STACK_MAX_CHILDREN - 1;

function isEmbeddedStackPrimitive(value: unknown): value is {
  type?: unknown;
  props?: { children?: unknown };
} {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    ((value as { type?: unknown }).type === "x_stack" ||
      (value as { type?: unknown }).type === "y_stack")
  );
}

const EmbeddedPrimitiveSchema: z.ZodType<{
  type: string;
  visible?: boolean;
  props: Record<string, unknown>;
}> = z.lazy(() =>
  z
    .object({
      type: z.string(),
      visible: z.boolean().optional(),
      props: z.record(z.string(), z.unknown()),
    })
    .strict()
    .superRefine((primitive, ctx) => {
      if (primitive.type !== "x_stack" && primitive.type !== "y_stack") {
        return;
      }
      const children = primitive.props.children;
      if (!Array.isArray(children)) {
        return;
      }
      if (children.length > STACK_MAX_CHILDREN) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_big,
          maximum: STACK_MAX_CHILDREN,
          type: "array",
          inclusive: true,
          path: ["props", "children"],
          message: `Nested stacks can contain at most ${STACK_MAX_CHILDREN} children`,
        });
      }
      children.forEach((child, index) => {
        if (!isEmbeddedStackPrimitive(child)) {
          return;
        }
        const grandChildren = child.props?.children;
        if (!Array.isArray(grandChildren)) {
          return;
        }
        if (grandChildren.length > STACK_MAX_CHILDREN) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_big,
            maximum: STACK_MAX_CHILDREN,
            type: "array",
            inclusive: true,
            path: ["props", "children", index, "props", "children"],
            message: `Nested stacks can contain at most ${STACK_MAX_CHILDREN} children`,
          });
        }
        grandChildren.forEach((grandChild, grandChildIndex) => {
          if (!isEmbeddedStackPrimitive(grandChild)) {
            return;
          }
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [
              "props",
              "children",
              index,
              "props",
              "children",
              grandChildIndex,
              "type",
            ],
            message:
              "Stacks can nest up to 2 levels; nested stacks cannot contain another x_stack/y_stack",
          });
        });
      });
    }),
);

const StackAlignItemsSchema = z.enum([
  "flex-start",
  "center",
  "flex-end",
  "stretch",
]);

const StackJustifyContentSchema = z.enum([
  "flex-start",
  "center",
  "flex-end",
  "space-between",
  "space-around",
]);

const StackShadowSchema = z.enum(["none", "sm", "md", "lg"]);

const StackSurfacePropsSchema = z
  .object({
    bg: ComponentBgSchema.optional(),
    radius: z.number().min(0).max(999).optional(),
    padding: z.number().min(0).max(96).optional(),
    height: z.number().min(0).max(1200).optional(),
    gap: z.number().min(0).max(64).optional(),
    shadow: StackShadowSchema.optional(),
    borderColor: z.string().trim().min(1).optional(),
    borderWidth: z.number().min(0).max(12).optional(),
    alignItems: StackAlignItemsSchema.optional(),
    justifyContent: StackJustifyContentSchema.optional(),
    centerChildIndex: z.number().int().min(0).max(STACK_MAX_CENTER_CHILD_INDEX).optional(),
    layout: z.enum(["stack", "grid"]).optional(),
    columns: z.number().int().min(2).max(4).optional(),
    rowGap: z.number().min(0).max(64).optional(),
    columnGap: z.number().min(0).max(64).optional(),
    overlay: z.boolean().optional(),
    overlayPlacement: z.enum(["top", "bottom"]).optional(),
    children: z.array(EmbeddedPrimitiveSchema).max(STACK_MAX_CHILDREN).optional(),
  })
  .strict();

const StackPropsSchema = StackSurfacePropsSchema.extend({
  paddingHorizontal: z.number().min(0).max(96).optional(),
  paddingVertical: z.number().min(0).max(96).optional(),
}).strict();

export const XStackPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("x_stack"),
  props: StackPropsSchema,
});

export const YStackPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("y_stack"),
  props: StackPropsSchema,
});

export const QuizPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("quiz"),
  props: StackSurfacePropsSchema.omit({ children: true })
    .extend({
      mode: z.enum(["single", "multi"]),
      layout: z
        .enum(["list", "grid", "radio-list", "checkmark-list"])
        .optional(),
      required: z.boolean().optional(),
      options: z
        .array(
          z
            .object({
              id: z.string().trim().min(1),
              label: z.string(),
              subtitle: z.string().optional(),
              icon: PhosphorIconNameSchema.optional(),
              nextStepId: z.string().trim().min(1).optional(),
            })
            .strict(),
        )
        .min(1),
      selectedIds: z.array(z.string().trim().min(1)).optional(),
      borderColor: z.string().optional(),
      borderWidth: z.number().min(0).max(12).optional(),
      selectionColor: z.string().optional(),
      selectionBorderColor: z.string().optional(),
      iconColor: z.string().optional(),
      iconSize: z.number().min(4).max(128).optional(),
      iconWeight: PhosphorIconWeightSchema.optional(),
      color: z.string().optional(),
      fontSize: z.number().min(8).max(64).optional(),
      fontFamily: TextFontFamilySchema.optional(),
      fontWeight: TextFontWeightSchema.optional(),
      lineHeight: TextLineHeightSchema.optional(),
      subtitleColor: z.string().optional(),
      subtitleFontSize: z.number().min(8).max(64).optional(),
      subtitleFontFamily: TextFontFamilySchema.optional(),
      subtitleFontWeight: TextFontWeightSchema.optional(),
      subtitleLineHeight: TextLineHeightSchema.optional(),
    })
    .strict(),
});

export const FeaturesPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("features"),
  props: StackSurfacePropsSchema.omit({ children: true })
    .extend({
      layout: z.enum(["list", "grid"]).optional(),
      items: z
        .array(
          z
            .object({
              id: z.string().trim().min(1),
              title: z.string(),
              subtitle: z.string().optional(),
              icon: PhosphorIconNameSchema.optional(),
            })
            .strict(),
        )
        .min(1),
      iconColor: z.string().optional(),
      iconBg: z.string().optional(),
      iconSize: z.number().min(4).max(128).optional(),
      iconRadius: z.number().min(0).max(999).optional(),
      iconPadding: z.number().min(0).max(96).optional(),
      iconWeight: PhosphorIconWeightSchema.optional(),
      titleColor: z.string().optional(),
      subtitleColor: z.string().optional(),
      titleFontSize: z.number().min(8).max(64).optional(),
      subtitleFontSize: z.number().min(8).max(64).optional(),
      fontFamily: TextFontFamilySchema.optional(),
      titleFontWeight: TextFontWeightSchema.optional(),
      subtitleFontWeight: TextFontWeightSchema.optional(),
      titleLineHeight: TextLineHeightSchema.optional(),
      subtitleLineHeight: TextLineHeightSchema.optional(),
    })
    .strict(),
});

export const TestimonialCardPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("testimonial_card"),
  props: StackSurfacePropsSchema.omit({ children: true })
    .extend({
      text: z.string(),
      name: z.string().optional(),
      role: z.string().optional(),
      rating: z.number().min(0).max(5).optional(),
      ratingIconVariant: z.enum(["filled", "outlined"]).optional(),
      src: z.string().url().optional(),
      bucket: z.string().trim().min(1).optional(),
      path: z.string().trim().min(1).optional(),
      avatarSize: z.number().min(0).max(240).optional(),
      avatarRadius: z.number().min(0).max(999).optional(),
      textColor: z.string().optional(),
      nameColor: z.string().optional(),
      roleColor: z.string().optional(),
      ratingColor: z.string().optional(),
      textFontSize: z.number().min(8).max(64).optional(),
      nameFontSize: z.number().min(8).max(64).optional(),
      roleFontSize: z.number().min(8).max(64).optional(),
      fontFamily: TextFontFamilySchema.optional(),
      textFontWeight: TextFontWeightSchema.optional(),
      nameFontWeight: TextFontWeightSchema.optional(),
      roleFontWeight: TextFontWeightSchema.optional(),
      textLineHeight: TextLineHeightSchema.optional(),
      nameLineHeight: TextLineHeightSchema.optional(),
      roleLineHeight: TextLineHeightSchema.optional(),
    })
    .strict(),
});

export const LoadingPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("loading"),
  props: z
    .object({
      messages: z.array(z.string()).optional(),
      durationMs: z.number().min(500).max(10_000).optional(),
      color: z.string().optional(),
      size: z.number().min(12).max(160).optional(),
      strokeWidth: z.number().min(1).max(64).optional(),
      messageColor: z.string().optional(),
      messageFontSize: z.number().min(8).max(64).optional(),
      fontFamily: TextFontFamilySchema.optional(),
      fontWeight: TextFontWeightSchema.optional(),
      lineHeight: TextLineHeightSchema.optional(),
    })
    .strict(),
});

const NumericMetricPickerPropsSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
    value: z.number().optional(),
    selectorBg: z.string().optional(),
    selectorBorderColor: z.string().optional(),
    selectorBorderRadius: z.number().min(0).max(999).optional(),
    selectorBorderWidth: z.number().min(0).max(12).optional(),
    selectorHeight: z.number().min(0).max(240).optional(),
    selectorPaddingHorizontal: z.number().min(0).max(96).optional(),
    selectorPaddingVertical: z.number().min(0).max(96).optional(),
    selectorLabel: z.string().optional(),
    valueSuffix: z.string().optional(),
    selectorLabelColor: z.string().optional(),
    selectorLabelFontSize: z.number().min(8).max(64).optional(),
    selectorLabelFontFamily: TextFontFamilySchema.optional(),
    selectorLabelFontWeight: TextFontWeightSchema.optional(),
    selectorValueColor: z.string().optional(),
    selectorValueFontSize: z.number().min(8).max(96).optional(),
    selectorValueFontFamily: TextFontFamilySchema.optional(),
    selectorValueFontWeight: TextFontWeightSchema.optional(),
    selectorChevronColor: z.string().optional(),
    selectorChevronSize: z.number().min(4).max(96).optional(),
    sheetBg: ComponentBgSchema.optional(),
    sheetTitle: z.string().optional(),
    sheetTitleColor: z.string().optional(),
    sheetRadius: z.number().min(0).max(999).optional(),
    sheetHandleColor: z.string().optional(),
    backdropColor: z.string().optional(),
    selectedItemColor: z.string().optional(),
    itemColor: z.string().optional(),
    itemFontSize: z.number().min(8).max(96).optional(),
    selectedItemFontSize: z.number().min(8).max(128).optional(),
    itemFontFamily: TextFontFamilySchema.optional(),
    itemFontWeight: TextFontWeightSchema.optional(),
    selectedItemFontWeight: TextFontWeightSchema.optional(),
    actionText: z.string().optional(),
    actionBg: z.string().optional(),
    actionColor: z.string().optional(),
    actionRadius: z.number().min(0).max(999).optional(),
    actionFontSize: z.number().min(8).max(64).optional(),
    actionFontFamily: TextFontFamilySchema.optional(),
    actionFontWeight: TextFontWeightSchema.optional(),
    doneText: z.string().optional(),
    doneBg: z.string().optional(),
    doneColor: z.string().optional(),
    doneRadius: z.number().min(0).max(999).optional(),
  })
  .strict();

export const AgePickerPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("age_picker"),
  props: NumericMetricPickerPropsSchema,
});

export const HeightPickerPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("height_picker"),
  props: NumericMetricPickerPropsSchema.extend({
    unit: z.enum(["cm", "ft"]).optional(),
    unitMode: z.enum(["cm", "ft", "cm_ft"]).optional(),
    unitSwitchBg: z.string().optional(),
    unitSwitchActiveBg: z.string().optional(),
    unitSwitchTextColor: z.string().optional(),
    unitSwitchActiveTextColor: z.string().optional(),
    unitSwitchBorderColor: z.string().optional(),
    unitSwitchBorderWidth: z.number().min(0).max(12).optional(),
    unitSwitchRadius: z.number().min(0).max(999).optional(),
    unitSwitchWidth: z.number().min(80).max(320).optional(),
    unitSwitchHeight: z.number().min(24).max(96).optional(),
    unitSwitchFontSize: z.number().min(8).max(32).optional(),
    unitSwitchFontFamily: TextFontFamilySchema.optional(),
    unitSwitchFontWeight: TextFontWeightSchema.optional(),
  }).strict(),
});

export const WeightPickerPrimitiveSchema = PrimitiveBaseSchema.extend({
  type: z.literal("weight_picker"),
  props: NumericMetricPickerPropsSchema.extend({
    unit: z.enum(["kg", "lb"]).optional(),
    unitMode: z.enum(["kg", "lb", "kg_lb"]).optional(),
    unitSwitchBg: z.string().optional(),
    unitSwitchActiveBg: z.string().optional(),
    unitSwitchTextColor: z.string().optional(),
    unitSwitchActiveTextColor: z.string().optional(),
    unitSwitchBorderColor: z.string().optional(),
    unitSwitchBorderWidth: z.number().min(0).max(12).optional(),
    unitSwitchRadius: z.number().min(0).max(999).optional(),
    unitSwitchWidth: z.number().min(80).max(320).optional(),
    unitSwitchHeight: z.number().min(24).max(96).optional(),
    unitSwitchFontSize: z.number().min(8).max(32).optional(),
    unitSwitchFontFamily: TextFontFamilySchema.optional(),
    unitSwitchFontWeight: TextFontWeightSchema.optional(),
  }).strict(),
});

export type Slot = z.infer<typeof SlotSchema>;
export type TextFontFamily = z.infer<typeof TextFontFamilySchema>;
export type TextFontWeight = z.infer<typeof TextFontWeightSchema>;
export type TextLineHeight = z.infer<typeof TextLineHeightSchema>;
export type TitleFontWeight = z.infer<typeof TitleFontWeightSchema>;
export type PhosphorIconName = z.infer<typeof PhosphorIconNameSchema>;
export type PhosphorIconWeight = z.infer<typeof PhosphorIconWeightSchema>;
export type CTAButtonVariant = z.infer<typeof CTAButtonVariantSchema>;
export type CTAButtonIconPosition = z.infer<typeof CTAButtonIconPositionSchema>;
export type CTAButtonAction = z.infer<typeof CTAButtonActionSchema>;
export type SkipButtonVariant = z.infer<typeof SkipButtonVariantSchema>;
export type StackAlignItems = z.infer<typeof StackAlignItemsSchema>;
export type StackJustifyContent = z.infer<typeof StackJustifyContentSchema>;
export type StackShadow = z.infer<typeof StackShadowSchema>;
