import { z } from "zod";

export const BUILDER_V2_LOTTIE_CAPABILITY_VERSION = 1 as const;
export const BUILDER_V2_LOTTIE_PACKAGE_NAME =
  "lottie-react-native" as const;
export const BUILDER_V2_LOTTIE_PACKAGE_VERSION = "7.3.8" as const;
export const BUILDER_V2_LOTTIE_RUNTIME_PACKAGE_NAME =
  "@onborn/runtime-capability-lottie" as const;

const LottieAssetIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);

const LottieSourcePathSchema = z
  .string()
  .trim()
  .min(1)
  .max(320)
  .regex(/\.json$/)
  .refine(
    (path) =>
      !path.startsWith("/") &&
      !path.includes("\\") &&
      path
        .split("/")
        .every(
          (segment) => segment !== "" && segment !== "." && segment !== "..",
        ),
    { message: "Lottie assets must use safe relative JSON paths" },
  );

export const BuilderV2LottieReducedMotionFallbackSchema =
  z.literal("first-frame");

export const BuilderV2ProjectLottieAssetSchema = z
  .object({
    assetId: LottieAssetIdSchema,
    file: LottieSourcePathSchema,
    reducedMotionFallback: BuilderV2LottieReducedMotionFallbackSchema,
  })
  .strict();

export const BuilderV2ProjectLottieSchema = z
  .object({
    packageName: z.literal(BUILDER_V2_LOTTIE_PACKAGE_NAME),
    packageVersion: z.literal(BUILDER_V2_LOTTIE_PACKAGE_VERSION),
    assets: z.array(BuilderV2ProjectLottieAssetSchema).min(1).max(100),
  })
  .strict()
  .superRefine((lottie, context) => {
    addDuplicateIssues(
      lottie.assets,
      "assetId",
      "Lottie asset id",
      context,
    );
    addDuplicateIssues(
      lottie.assets,
      "file",
      "Lottie asset file",
      context,
    );
  });

export const BuilderV2ArtifactLottieAssetSchema =
  BuilderV2ProjectLottieAssetSchema.extend({
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    byteLength: z.number().int().positive().max(500_000),
    width: z.number().int().positive().max(4_096),
    height: z.number().int().positive().max(4_096),
    frameRate: z.number().positive().max(120),
    inPoint: z.number().finite(),
    outPoint: z.number().finite(),
  }).strict();

export const BuilderV2ArtifactLottieSchema = z
  .object({
    packageName: z.literal(BUILDER_V2_LOTTIE_PACKAGE_NAME),
    packageVersion: z.literal(BUILDER_V2_LOTTIE_PACKAGE_VERSION),
    assets: z.array(BuilderV2ArtifactLottieAssetSchema).min(1).max(100),
  })
  .strict();

export type BuilderV2ProjectLottieAsset = z.infer<
  typeof BuilderV2ProjectLottieAssetSchema
>;
export type BuilderV2ProjectLottie = z.infer<
  typeof BuilderV2ProjectLottieSchema
>;
export type BuilderV2ArtifactLottieAsset = z.infer<
  typeof BuilderV2ArtifactLottieAssetSchema
>;
export type BuilderV2ArtifactLottie = z.infer<
  typeof BuilderV2ArtifactLottieSchema
>;

function addDuplicateIssues(
  assets: ReadonlyArray<{ assetId: string; file: string }>,
  field: "assetId" | "file",
  label: string,
  context: z.RefinementCtx,
): void {
  const values = new Set<string>();
  assets.forEach((asset, index) => {
    if (values.has(asset[field])) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate ${label} "${asset[field]}"`,
        path: ["assets", index, field],
      });
    }
    values.add(asset[field]);
  });
}
