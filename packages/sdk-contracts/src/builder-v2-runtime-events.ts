import { z } from "zod";

import {
  BuilderV2InteractionKindSchema,
  BuilderV2InstrumentationManifestSchema,
} from "./builder-v2-instrumentation";
import {
  BuilderV2ArtifactTargetSchema,
  BuilderV2RuntimeVersionSchema,
} from "./builder-v2-runtime-platform";
import { BuilderV2UiIrJsonValueSchema } from "./builder-v2-ui-ir-primitives";
import { RuntimeExperimentAssignmentSchema } from "./experiment";

const RuntimeIdentifierSchema = z.string().trim().min(1).max(320);
const ArtifactIdentifierSchema = z.string().regex(/^[a-f0-9]{64}$/);
const RuntimeFlowNameSchema = z.string().trim().min(1).max(120);

const RuntimeScreenContextSchema = z
  .object({
    position: z.number().int().nonnegative(),
    surface: z.enum(["onboarding", "paywall"]),
  })
  .strict();

const ScreenActionSchema = z
  .object({
    type: z.enum([
      "screen_viewed",
      "screen_completed",
      "screen_skipped",
      "screen_returned",
    ]),
    screenId: RuntimeIdentifierSchema,
  })
  .strict();

const InteractionActionSchema = z
  .object({
    type: z.literal("interaction_triggered"),
    screenId: RuntimeIdentifierSchema,
    nodeId: RuntimeIdentifierSchema,
    interactionId: RuntimeIdentifierSchema,
    kind: BuilderV2InteractionKindSchema,
  })
  .strict();

const CustomEventActionSchema = z
  .object({
    type: z.literal("custom_event"),
    screenId: RuntimeIdentifierSchema,
    nodeId: RuntimeIdentifierSchema,
    eventName: z.string().trim().min(1).max(120),
    properties: z
      .record(z.string().trim().min(1).max(120), BuilderV2UiIrJsonValueSchema)
      .optional(),
  })
  .strict();

const ExperimentActionSchema = z
  .object({
    type: z.literal("experiment_exposed"),
  })
  .strict();

const PaywallActionSchema = z
  .object({
    type: z.enum([
      "paywall_viewed",
      "paywall_dismissed",
      "purchase_started",
      "purchase_completed",
      "purchase_failed",
    ]),
    screenId: RuntimeIdentifierSchema,
    packageId: RuntimeIdentifierSchema.optional(),
    productId: RuntimeIdentifierSchema.optional(),
    reason: z.string().trim().min(1).max(240).optional(),
  })
  .strict();

const RestoreActionSchema = z
  .object({
    type: z.enum([
      "restore_started",
      "restore_completed",
      "restore_empty",
      "restore_failed",
    ]),
    screenId: RuntimeIdentifierSchema,
    reason: z.string().trim().min(1).max(240).optional(),
  })
  .strict();

export const BuilderV2RuntimeSemanticActionSchema = z.discriminatedUnion(
  "type",
  [
    z
      .object({
        type: z.enum([
          "flow_completed",
          "flow_skipped",
          "flow_dismissed",
        ]),
      })
      .strict(),
    ScreenActionSchema,
    InteractionActionSchema,
    CustomEventActionSchema,
    ExperimentActionSchema,
    PaywallActionSchema,
    RestoreActionSchema,
  ],
).superRefine((action, context) => {
  if (action.type === "purchase_completed" && !action.productId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Completed purchases require a product ID",
      path: ["productId"],
    });
  }
});

export const BuilderV2RuntimeAnalyticsEventSchema = z
  .object({
    schemaVersion: z.literal(1),
    action: BuilderV2RuntimeSemanticActionSchema,
    flowId: RuntimeIdentifierSchema,
    flowName: RuntimeFlowNameSchema,
    sessionId: RuntimeIdentifierSchema,
    environment: z.enum(["test", "prod"]),
    target: BuilderV2ArtifactTargetSchema,
    runtimeVersion: BuilderV2RuntimeVersionSchema,
    artifactId: ArtifactIdentifierSchema,
    releaseId: ArtifactIdentifierSchema,
    experiment: RuntimeExperimentAssignmentSchema.optional(),
    occurredAt: z.string().datetime(),
    screenContext: RuntimeScreenContextSchema.optional(),
  })
  .strict()
  .superRefine((event, context) => {
    const referencesScreen = "screenId" in event.action;
    if (referencesScreen && !event.screenContext) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Screen runtime actions require signed screen context",
        path: ["screenContext"],
      });
    }
    if (!referencesScreen && event.screenContext) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Flow runtime actions cannot carry screen context",
        path: ["screenContext"],
      });
    }
    if (event.action.type === "experiment_exposed" && !event.experiment) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Experiment exposure requires a host-owned assignment",
        path: ["experiment"],
      });
    }
  });

export const BuilderV2RuntimeStartedEventSchema = z
  .object({
    schemaVersion: z.literal(1),
    action: z
      .object({
        type: z.enum(["flow_started", "flow_resumed"]),
      })
      .strict(),
    flowId: RuntimeIdentifierSchema,
    flowName: RuntimeFlowNameSchema,
    sessionId: RuntimeIdentifierSchema,
    environment: z.enum(["test", "prod"]),
    target: BuilderV2ArtifactTargetSchema,
    runtimeVersion: BuilderV2RuntimeVersionSchema,
    artifactId: ArtifactIdentifierSchema,
    releaseId: ArtifactIdentifierSchema,
    experiment: RuntimeExperimentAssignmentSchema.optional(),
    occurredAt: z.string().datetime(),
  })
  .strict();

export const BuilderV2RuntimeEventSchema = z.union([
  BuilderV2RuntimeStartedEventSchema,
  BuilderV2RuntimeAnalyticsEventSchema,
]);

export const BuilderV2RuntimeInstrumentedArtifactSchema = z
  .object({
    instrumentation: BuilderV2InstrumentationManifestSchema,
  })
  .strict();

export type BuilderV2RuntimeSemanticAction = z.infer<
  typeof BuilderV2RuntimeSemanticActionSchema
>;
export type BuilderV2RuntimeAnalyticsEvent = z.infer<
  typeof BuilderV2RuntimeAnalyticsEventSchema
>;
export type BuilderV2RuntimeStartedEvent = z.infer<
  typeof BuilderV2RuntimeStartedEventSchema
>;
export type BuilderV2RuntimeEvent = z.infer<
  typeof BuilderV2RuntimeEventSchema
>;
