import { z } from "zod";

import { BuilderV2ArtifactGoogleFontSchema } from "./builder-v2-google-fonts";

import {
  BuilderV2ArtifactSignatureSchema,
  BuilderV2ArtifactSourceSchema,
} from "./builder-v2-artifact-lineage";
import { BuilderV2InstrumentationManifestSchema } from "./builder-v2-instrumentation";
import {
  BuilderV2ArtifactTargetSchema,
  BuilderV2CapabilityRequirementSchema,
  BuilderV2RuntimeVersionSchema,
} from "./builder-v2-runtime-platform";
import { BUILDER_V2_UI_IR_FORMAT } from "./builder-v2-ui-ir";
import { RuntimeExperimentAssignmentSchema } from "./experiment";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const RelativeArtifactPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(320)
  .refine((path) => !path.startsWith("/") && !path.includes("\\"), {
    message: "Artifact paths must be relative POSIX paths",
  })
  .refine(
    (path) =>
      path
        .split("/")
        .every(
          (segment) => segment !== "" && segment !== "." && segment !== "..",
        ),
    { message: "Artifact paths cannot contain unsafe segments" },
  );

export const BuilderV2UiIrArtifactFileRoleSchema = z.enum([
  "document",
  "source_references",
  "asset",
  "font",
]);

export const BuilderV2UiIrArtifactFileSchema = z
  .object({
    path: RelativeArtifactPathSchema,
    role: BuilderV2UiIrArtifactFileRoleSchema,
    contentHash: Sha256Schema,
    byteLength: z.number().int().nonnegative(),
  })
  .strict();

export const BuilderV2UiIrArtifactManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    artifactId: Sha256Schema,
    runtimeVersion: BuilderV2RuntimeVersionSchema,
    format: z.literal(BUILDER_V2_UI_IR_FORMAT),
    target: z.literal("universal"),
    source: BuilderV2ArtifactSourceSchema,
    entry: z
      .object({
        documentFile: RelativeArtifactPathSchema,
      })
      .strict(),
    files: z.array(BuilderV2UiIrArtifactFileSchema).min(1).max(2_000),
    /**
     * The Google Fonts the document's text renders in, embedded as files.
     *
     * Embedded rather than fetched at runtime: the artifact is signed, so its
     * typography has to be part of what was signed — and a device offline
     * after first launch still renders the design, not a system-font fallback.
     */
    fonts: z.array(BuilderV2ArtifactGoogleFontSchema).max(64).optional(),
    requiredCapabilities: z.array(BuilderV2CapabilityRequirementSchema).max(64),
    instrumentation: BuilderV2InstrumentationManifestSchema.optional(),
  })
  .strict()
  .superRefine((manifest, context) => {
    addDuplicatePathIssues(manifest.files, ["files"], context);
    for (const [index, font] of (manifest.fonts ?? []).entries()) {
      const file = manifest.files.find(
        (candidate) => candidate.path === font.file,
      );
      if (!file || file.role !== "font") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Every declared font must be carried as a font file",
          path: ["fonts", index, "file"],
        });
        continue;
      }
      if (
        file.contentHash !== font.contentHash ||
        file.byteLength !== font.byteLength
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A declared font must match its carried file byte for byte",
          path: ["fonts", index, "contentHash"],
        });
      }
    }
    addDuplicateCapabilityIssues(manifest.requiredCapabilities, context);
    const entry = manifest.files.find(
      (file) =>
        file.path === manifest.entry.documentFile && file.role === "document",
    );
    if (!entry) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "entry.documentFile must reference a document file",
        path: ["entry", "documentFile"],
      });
    }
  });

export const BuilderV2SignedUiIrArtifactSchema = z
  .object({
    manifest: BuilderV2UiIrArtifactManifestSchema,
    signature: BuilderV2ArtifactSignatureSchema,
  })
  .strict();

export const BuilderV2UiIrReleaseSchema = z
  .object({
    schemaVersion: z.literal(1),
    releaseId: Sha256Schema,
    flowId: z.string().trim().min(1).max(160),
    environment: z.enum(["test", "prod"]),
    source: BuilderV2ArtifactSourceSchema,
    runtimeVersion: BuilderV2RuntimeVersionSchema,
    artifactId: Sha256Schema,
    createdAt: z.string().datetime(),
    activatedAt: z.string().datetime(),
  })
  .strict();

export const BuilderV2UiIrArtifactDeliveryFileSchema =
  BuilderV2UiIrArtifactFileSchema.extend({
    url: z.string().url().max(8_192),
  }).strict();

export const BuilderV2UiIrArtifactDeliverySchema = z
  .object({
    schemaVersion: z.literal(1),
    release: BuilderV2UiIrReleaseSchema,
    requestedTarget: BuilderV2ArtifactTargetSchema,
    artifact: BuilderV2SignedUiIrArtifactSchema,
    files: z.array(BuilderV2UiIrArtifactDeliveryFileSchema).min(1).max(2_000),
    expiresAt: z.string().datetime(),
    /**
     * The experiment assignment this delivery serves, when a running
     * experiment assigned one. The schema is strict, so the server includes
     * it only for clients that asked (`assignment=1`) — a delivery parsed by
     * an older SDK never carries an unrecognized key.
     */
    experiment: RuntimeExperimentAssignmentSchema.optional(),
  })
  .strict()
  .superRefine((delivery, context) => {
    if (delivery.artifact.manifest.artifactId !== delivery.release.artifactId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Delivered artifact is not part of the active release",
        path: ["artifact", "manifest", "artifactId"],
      });
    }
    if (
      delivery.artifact.manifest.runtimeVersion !==
        delivery.release.runtimeVersion ||
      delivery.artifact.manifest.source.revisionId !==
        delivery.release.source.revisionId ||
      delivery.artifact.manifest.source.sourceHash !==
        delivery.release.source.sourceHash
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Delivered artifact source does not match the active release",
        path: ["artifact", "manifest", "source"],
      });
    }
    addDuplicatePathIssues(delivery.files, ["files"], context);
    addDeliveryFileIssues(delivery, context);
  });

function addDuplicatePathIssues(
  files: ReadonlyArray<{ path: string }>,
  path: Array<string | number>,
  context: z.RefinementCtx,
): void {
  const paths = new Set<string>();
  files.forEach((file, index) => {
    if (paths.has(file.path)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate artifact file path "${file.path}"`,
        path: [...path, index, "path"],
      });
    }
    paths.add(file.path);
  });
}

function addDuplicateCapabilityIssues(
  capabilities: ReadonlyArray<{ name: string }>,
  context: z.RefinementCtx,
): void {
  const names = new Set<string>();
  capabilities.forEach((capability, index) => {
    if (names.has(capability.name)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate required capability "${capability.name}"`,
        path: ["requiredCapabilities", index, "name"],
      });
    }
    names.add(capability.name);
  });
}

function addDeliveryFileIssues(
  delivery: z.infer<typeof BuilderV2UiIrArtifactDeliverySchema>,
  context: z.RefinementCtx,
): void {
  const expected = new Map(
    delivery.artifact.manifest.files.map((file) => [file.path, file]),
  );
  const actual = new Map(delivery.files.map((file) => [file.path, file]));
  delivery.artifact.manifest.files.forEach((file, index) => {
    if (!actual.has(file.path)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Missing delivery URL for artifact file "${file.path}"`,
        path: ["files", index],
      });
    }
  });
  delivery.files.forEach((file, index) => {
    const expectedFile = expected.get(file.path);
    if (
      !expectedFile ||
      expectedFile.role !== file.role ||
      expectedFile.contentHash !== file.contentHash ||
      expectedFile.byteLength !== file.byteLength
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Delivery metadata does not match "${file.path}"`,
        path: ["files", index],
      });
    }
  });
}

export type BuilderV2UiIrArtifactFile = z.infer<
  typeof BuilderV2UiIrArtifactFileSchema
>;
export type BuilderV2UiIrArtifactDeliveryFile = z.infer<
  typeof BuilderV2UiIrArtifactDeliveryFileSchema
>;
export type BuilderV2UiIrArtifactManifest = z.infer<
  typeof BuilderV2UiIrArtifactManifestSchema
>;
export type BuilderV2SignedUiIrArtifact = z.infer<
  typeof BuilderV2SignedUiIrArtifactSchema
>;
export type BuilderV2UiIrRelease = z.infer<typeof BuilderV2UiIrReleaseSchema>;
export type BuilderV2UiIrArtifactDelivery = z.infer<
  typeof BuilderV2UiIrArtifactDeliverySchema
>;
