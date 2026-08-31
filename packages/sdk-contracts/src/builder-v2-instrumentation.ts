import { z } from "zod";
import { BuilderV2ProjectSurfaceSchema } from "./builder-v2-project";
import { BuilderV2PaywallPlacementSchema } from "./builder-v2-paywall";

const InstrumentationIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(320)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_./:-]*$/);

const SourcePathSchema = z
  .string()
  .trim()
  .min(1)
  .max(320)
  .refine((path) => !path.startsWith("/") && !path.includes("\\"), {
    message: "Source paths must be relative POSIX paths",
  });

export const BuilderV2SourceRangeSchema = z
  .object({
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    line: z.number().int().positive(),
    column: z.number().int().positive(),
  })
  .strict()
  .refine((range) => range.end > range.start, {
    message: "Source range end must be greater than start",
  });

/**
 * What a screen asks of the person looking at it.
 *
 * Derived from the document at publish time and signed with the rest of the
 * manifest, so anything reasoning about a screen's shape (how many options it
 * offers, how many permissions it asks for at once) reads what actually
 * shipped rather than re-deriving it from source nobody can verify.
 *
 * Only what the dialect can express: a selection holds one value at a time, so
 * an option count is the number of distinct values the screen's own actions
 * can write, and there is no free-text field to describe.
 */
export const BuilderV2InstrumentedScreenShapeSchema = z
  .object({
    selections: z
      .array(
        z
          .object({
            state: z.string().trim().min(1).max(80),
            optionCount: z.number().int().nonnegative().max(200),
          })
          .strict(),
      )
      .max(24),
    capabilities: z.array(z.string().trim().min(1).max(60)).max(8),
  })
  .strict();

export const BuilderV2InstrumentedScreenSchema = z
  .object({
    screenId: InstrumentationIdSchema,
    file: SourcePathSchema,
    position: z.number().int().nonnegative(),
    surface: BuilderV2ProjectSurfaceSchema,
    placement: BuilderV2PaywallPlacementSchema.optional(),
    /** Absent on artifacts published before shapes were recorded. */
    shape: BuilderV2InstrumentedScreenShapeSchema.optional(),
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
  });

export const BuilderV2InstrumentedNodeSchema = z
  .object({
    nodeId: InstrumentationIdSchema,
    screenId: InstrumentationIdSchema,
    file: SourcePathSchema,
    component: z.string().trim().min(1).max(120),
    sourceRange: BuilderV2SourceRangeSchema,
  })
  .strict();

export const BuilderV2InteractionKindSchema = z.enum([
  "press",
  "long_press",
  "submit",
  "change",
  "value_change",
  "focus",
  "blur",
]);

export const BuilderV2InstrumentedInteractionSchema = z
  .object({
    interactionId: InstrumentationIdSchema,
    nodeId: InstrumentationIdSchema,
    screenId: InstrumentationIdSchema,
    kind: BuilderV2InteractionKindSchema,
  })
  .strict();

export const BuilderV2InstrumentationManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    entryScreenId: InstrumentationIdSchema,
    screens: z.array(BuilderV2InstrumentedScreenSchema).max(1_000),
    nodes: z.array(BuilderV2InstrumentedNodeSchema).max(20_000),
    interactions: z.array(BuilderV2InstrumentedInteractionSchema).max(20_000),
  })
  .strict()
  .superRefine((manifest, context) => {
    addUniqueIdIssues(
      manifest.screens,
      (screen) => screen.screenId,
      "screens",
      context,
    );
    addUniqueIdIssues(manifest.nodes, (node) => node.nodeId, "nodes", context);
    addUniqueIdIssues(
      manifest.interactions,
      (interaction) => interaction.interactionId,
      "interactions",
      context,
    );

    const screenIds = new Set(
      manifest.screens.map((screen) => screen.screenId),
    );
    const placements = new Set<string>();
    manifest.screens.forEach((screen, index) => {
      if (!screen.placement) return;
      if (placements.has(screen.placement)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate paywall placement "${screen.placement}"`,
          path: ["screens", index, "placement"],
        });
      }
      placements.add(screen.placement);
    });
    if (!screenIds.has(manifest.entryScreenId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unknown entry screen "${manifest.entryScreenId}"`,
        path: ["entryScreenId"],
      });
    }
    const nodeIds = new Set(manifest.nodes.map((node) => node.nodeId));

    manifest.nodes.forEach((node, index) => {
      if (!screenIds.has(node.screenId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown screen "${node.screenId}"`,
          path: ["nodes", index, "screenId"],
        });
      }
    });
    manifest.interactions.forEach((interaction, index) => {
      if (!screenIds.has(interaction.screenId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown screen "${interaction.screenId}"`,
          path: ["interactions", index, "screenId"],
        });
      }
      if (!nodeIds.has(interaction.nodeId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown node "${interaction.nodeId}"`,
          path: ["interactions", index, "nodeId"],
        });
      }
    });
  });

function addUniqueIdIssues<T>(
  values: T[],
  getId: (value: T) => string,
  path: string,
  context: z.RefinementCtx,
): void {
  const indexes = new Map<string, number>();
  values.forEach((value, index) => {
    const id = getId(value);
    if (!indexes.has(id)) {
      indexes.set(id, index);
      return;
    }
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Duplicate instrumentation id "${id}"`,
      path: [path, index],
    });
  });
}

export type BuilderV2SourceRange = z.infer<typeof BuilderV2SourceRangeSchema>;
export type BuilderV2InstrumentedScreen = z.infer<
  typeof BuilderV2InstrumentedScreenSchema
>;
export type BuilderV2InstrumentedNode = z.infer<
  typeof BuilderV2InstrumentedNodeSchema
>;
export type BuilderV2InstrumentedScreenShape = z.infer<
  typeof BuilderV2InstrumentedScreenShapeSchema
>;

export type BuilderV2InteractionKind = z.infer<
  typeof BuilderV2InteractionKindSchema
>;
export type BuilderV2InstrumentedInteraction = z.infer<
  typeof BuilderV2InstrumentedInteractionSchema
>;
export type BuilderV2InstrumentationManifest = z.infer<
  typeof BuilderV2InstrumentationManifestSchema
>;
