import {
  BuilderV2UiIrArtifactFileSchema,
  BuilderV2UiIrReleaseSchema,
  BuilderV2SignedUiIrArtifactSchema,
} from "@onborn/sdk-contracts/builder-v2-ui-ir-artifact";
import { z } from "zod";

export const UiIrArtifactCacheScopeSchema = z
  .object({
    flowId: z.string().trim().min(1).max(160),
    environment: z.enum(["test", "prod"]),
  })
  .strict();

export const CachedUiIrArtifactSchema = z
  .object({
    release: BuilderV2UiIrReleaseSchema,
    artifact: BuilderV2SignedUiIrArtifactSchema,
    files: z.array(
      BuilderV2UiIrArtifactFileSchema.extend({
        uri: z.string().min(1),
      }).strict(),
    ),
    activatedAt: z.string().datetime(),
  })
  .strict();

export const UiIrArtifactStageSchema = z
  .object({
    scope: UiIrArtifactCacheScopeSchema,
    release: BuilderV2UiIrReleaseSchema,
    artifact: BuilderV2SignedUiIrArtifactSchema,
    files: z.array(BuilderV2UiIrArtifactFileSchema),
  })
  .strict();
