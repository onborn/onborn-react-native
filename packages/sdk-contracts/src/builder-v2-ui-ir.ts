import { z } from "zod";

import { BuilderV2ProjectSurfaceSchema } from "./builder-v2-project";
import { BuilderV2ProjectAssetSchema } from "./builder-v2-project-assets";
import {
  BuilderV2UiIrJsonValueSchema,
  BuilderV2UiIrNodeSchema,
  type BuilderV2UiIrNode,
} from "./builder-v2-ui-ir-primitives";
import { BuilderV2UiIrBillingBindingSchema } from "./builder-v2-ui-ir-billing";
import { BuilderV2UiIrScreenStateSchema } from "./builder-v2-ui-ir-interaction";

export const BUILDER_V2_UI_IR_FORMAT = "onborn-ui-ir-v1" as const;
export const BUILDER_V2_UI_IR_SCHEMA_VERSION = 1 as const;

const UiIrIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

export const BuilderV2UiIrAssetSchema = BuilderV2ProjectAssetSchema;

export const BuilderV2UiIrScreenSchema = z
  .object({
    screenId: UiIrIdSchema,
    surface: BuilderV2ProjectSurfaceSchema,
    placement: z.string().trim().min(1).max(120).optional(),
    /**
     * The screen's named selections, with their initial values. Every state a
     * condition or a state.set action refers to is declared here, so the whole
     * state space is readable from the document.
     */
    state: z
      .record(z.string().trim().min(1).max(80), BuilderV2UiIrScreenStateSchema)
      .optional(),
    /**
     * Which offering this screen's plan bindings read. The runtime needs it
     * before it can resolve a single price, so it travels in the document
     * rather than staying behind in the project manifest.
     */
    billing: BuilderV2UiIrBillingBindingSchema.optional(),
    root: BuilderV2UiIrNodeSchema,
  })
  .strict()
  .superRefine((screen, context) => {
    if (screen.placement && screen.surface !== "paywall") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only paywall screens can declare a placement",
        path: ["placement"],
      });
    }
    if (screen.billing && screen.surface !== "paywall") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only paywall screens can bind an offering",
        path: ["billing"],
      });
    }
    addDuplicateNodeIssues(screen.root, context);
  });

export const BuilderV2UiIrLocalizationSchema = z
  .object({
    defaultLocale: z.string().trim().min(2).max(35),
    resources: z.record(
      z.string().trim().min(2).max(35),
      z.record(z.string().trim().min(1).max(240), z.string().max(32_000)),
    ),
  })
  .strict()
  .superRefine((localization, context) => {
    if (!localization.resources[localization.defaultLocale]) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "defaultLocale must reference embedded resources",
        path: ["defaultLocale"],
      });
    }
  });

export const BuilderV2UiIrDocumentSchema = z
  .object({
    schemaVersion: z.literal(BUILDER_V2_UI_IR_SCHEMA_VERSION),
    format: z.literal(BUILDER_V2_UI_IR_FORMAT),
    entryScreenId: UiIrIdSchema,
    screens: z.array(BuilderV2UiIrScreenSchema).min(1).max(1_000),
    assets: z.array(BuilderV2UiIrAssetSchema).max(2_000),
    localization: BuilderV2UiIrLocalizationSchema.optional(),
    metadata: z
      .record(z.string().trim().min(1).max(120), BuilderV2UiIrJsonValueSchema)
      .optional(),
  })
  .strict()
  .superRefine((document, context) => {
    const screenIds = new Set<string>();
    const placements = new Set<string>();
    /*
     * One offering per flow.
     *
     * The host loads an offering once, before any screen renders, so two
     * paywalls naming different offerings could not both be right — one of them
     * would silently sell the other's plans at the other's prices. Refusing at
     * publish time is the only place this can be caught before someone is
     * charged for the wrong thing.
     */
    const offeringKeys = new Set(
      document.screens
        .map((screen) => screen.billing?.offeringKey)
        .filter((key): key is string => Boolean(key)),
    );
    if (offeringKeys.size > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `A flow sells one offering; this one names ${[...offeringKeys]
          .map((key) => `"${key}"`)
          .join(" and ")}.`,
        path: ["screens"],
      });
    }
    document.screens.forEach((screen, index) => {
      if (screenIds.has(screen.screenId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate screen id "${screen.screenId}"`,
          path: ["screens", index, "screenId"],
        });
      }
      screenIds.add(screen.screenId);
      if (screen.placement) {
        if (placements.has(screen.placement)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate paywall placement "${screen.placement}"`,
            path: ["screens", index, "placement"],
          });
        }
        placements.add(screen.placement);
      }
    });
    if (!screenIds.has(document.entryScreenId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "entryScreenId must reference a declared screen",
        path: ["entryScreenId"],
      });
    }
    addDuplicateAssetIssues(document.assets, context);
  });

function addDuplicateNodeIssues(
  root: BuilderV2UiIrNode,
  context: z.RefinementCtx,
): void {
  const ids = new Set<string>();
  const visit = (node: BuilderV2UiIrNode): void => {
    if (ids.has(node.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate node id "${node.id}"`,
        path: ["root"],
      });
    }
    ids.add(node.id);
    if ("children" in node) {
      node.children.forEach(visit);
    }
  };
  visit(root);
}

function addDuplicateAssetIssues(
  assets: ReadonlyArray<{ assetId: string; file: string }>,
  context: z.RefinementCtx,
): void {
  const ids = new Set<string>();
  const files = new Set<string>();
  assets.forEach((asset, index) => {
    for (const [value, values, field] of [
      [asset.assetId, ids, "assetId"],
      [asset.file, files, "file"],
    ] as const) {
      if (values.has(value)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate UI IR asset ${field} "${value}"`,
          path: ["assets", index, field],
        });
      }
      values.add(value);
    }
  });
}

export type BuilderV2UiIrAsset = z.infer<typeof BuilderV2UiIrAssetSchema>;
export type BuilderV2UiIrScreen = z.infer<typeof BuilderV2UiIrScreenSchema>;
export type BuilderV2UiIrLocalization = z.infer<
  typeof BuilderV2UiIrLocalizationSchema
>;
export type BuilderV2UiIrDocument = z.infer<typeof BuilderV2UiIrDocumentSchema>;

export * from "./builder-v2-ui-ir-primitives";
