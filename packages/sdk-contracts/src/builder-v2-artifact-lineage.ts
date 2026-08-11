import { z } from "zod";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const Base64UrlSchema = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[A-Za-z0-9_-]+$/);

export const BuilderV2ArtifactSourceSchema = z
  .object({
    revisionId: z.string().uuid(),
    sequence: z.number().int().positive(),
    sourceHash: Sha256Schema,
    specificationLineage: z
      .object({
        planHash: Sha256Schema,
        designHash: Sha256Schema,
      })
      .strict()
      .nullable(),
  })
  .strict();

export const BuilderV2ArtifactSignatureSchema = z
  .object({
    schemaVersion: z.literal(1),
    algorithm: z.literal("ed25519"),
    keyId: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[A-Za-z0-9._-]+$/),
    manifestHash: Sha256Schema,
    value: Base64UrlSchema,
  })
  .strict();

export type BuilderV2ArtifactSource = z.infer<
  typeof BuilderV2ArtifactSourceSchema
>;
export type BuilderV2ArtifactSignature = z.infer<
  typeof BuilderV2ArtifactSignatureSchema
>;
