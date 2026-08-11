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
  BuilderV2UiIrPressFeedbackSchema,
  type BuilderV2UiIrPressFeedback,
} from "./builder-v2-ui-ir-interaction";
import {
  BuilderV2UiIrVectorPaintSchema,
  BuilderV2UiIrVectorScalarSchema,
  type BuilderV2UiIrVectorPaint,
  type BuilderV2UiIrVectorScalar,
} from "./builder-v2-ui-ir-vector";

export * from "./builder-v2-ui-ir-motion";
export * from "./builder-v2-ui-ir-interaction";
export * from "./builder-v2-ui-ir-vector";

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

export const BuilderV2UiIrStyleSchema = z
  .record(z.string().min(1).max(120), BuilderV2UiIrJsonValueSchema)
  .superRefine((style, context) => {
    if (Object.keys(style).length > 160) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A UI IR style cannot contain more than 160 properties",
      });
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
]);

export const BuilderV2UiIrActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("navigation.next") }).strict(),
  z.object({ type: z.literal("navigation.back") }).strict(),
  z.object({ type: z.literal("navigation.complete") }).strict(),
  z
    .object({
      type: z.literal("paywall.open"),
      placement: z.string().trim().min(1).max(120),
    })
    .strict(),
  z
    .object({
      type: z.literal("billing.purchase"),
      packageId: z.string().trim().min(1).max(160),
    })
    .strict(),
  z.object({ type: z.literal("billing.restore") }).strict(),
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
    })
    .strict(),
]);

type NodeBase = {
  id: string;
  style?: Record<string, BuilderV2UiIrJsonValue>;
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
  | (NodeBase & {
      type: "pressable";
      action: z.infer<typeof BuilderV2UiIrActionSchema>;
      disabled?: boolean;
      contentStyle?: Record<string, BuilderV2UiIrJsonValue>;
      feedback?: BuilderV2UiIrPressFeedback;
      children: BuilderV2UiIrNode[];
    })
  | (NodeBase & {
      type: "status-bar";
      barStyle?: "default" | "light-content" | "dark-content";
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
    });

const CommonNodeSchema = z.object({
  id: UiIrIdSchema,
  style: BuilderV2UiIrStyleSchema.optional(),
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
        type: z.literal("pressable"),
        action: BuilderV2UiIrActionSchema,
        disabled: z.boolean().optional(),
        contentStyle: BuilderV2UiIrStyleSchema.optional(),
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
    ]),
);

export type BuilderV2UiIrStyle = z.infer<typeof BuilderV2UiIrStyleSchema>;
export type BuilderV2UiIrSourceRef = z.infer<
  typeof BuilderV2UiIrSourceRefSchema
>;
export type BuilderV2UiIrText = z.infer<typeof BuilderV2UiIrTextSchema>;
export type BuilderV2UiIrAction = z.infer<typeof BuilderV2UiIrActionSchema>;
