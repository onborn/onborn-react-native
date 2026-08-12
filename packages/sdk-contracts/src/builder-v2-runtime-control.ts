import { z } from "zod";

export const BuilderV2MobileRuntimeTargetSchema = z.enum(["ios", "android"]);

export const BuilderV2RuntimeControlReasonSchema = z.enum([
  "global_disabled",
  "environment_disabled",
]);

export const BuilderV2RuntimeControlSchema = z
  .object({
    schemaVersion: z.literal(1),
    enabled: z.boolean(),
    reason: BuilderV2RuntimeControlReasonSchema.nullable(),
    checkedAt: z.string().datetime(),
    recheckAfterSeconds: z.number().int().min(5).max(3600),
  })
  .strict();

export type BuilderV2RuntimeControl = z.infer<
  typeof BuilderV2RuntimeControlSchema
>;

export const BuilderV2RuntimeHealthEventSchema = z
  .object({
    schemaVersion: z.literal(1),
    event: z.enum([
      "control_check_failed",
      "runtime_blocked",
      "load_succeeded",
      "load_failed",
    ]),
    flowId: z.string().trim().min(1).max(128),
    environment: z.enum(["test", "prod"]),
    target: BuilderV2MobileRuntimeTargetSchema,
    occurredAt: z.string().datetime(),
    durationMs: z
      .number()
      .int()
      .min(0)
      .max(15 * 60 * 1000),
    source: z
      .enum(["network", "last-known-good", "session-pinned", "cache-current"])
      .optional(),
    artifactId: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    releaseId: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    failureCode: z.string().trim().min(1).max(80).optional(),
    fallbackUsed: z.boolean().optional(),
  })
  .strict();

export type BuilderV2RuntimeHealthEvent = z.infer<
  typeof BuilderV2RuntimeHealthEventSchema
>;
export type BuilderV2MobileRuntimeTarget = z.infer<
  typeof BuilderV2MobileRuntimeTargetSchema
>;
