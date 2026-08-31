import { z } from "zod";

export const BUILDER_V2_LOTTIE_CAPABILITY_VERSION = 1 as const;
export const BUILDER_V2_LOTTIE_PACKAGE_NAME = "lottie-react-native" as const;
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
    addDuplicateIssues(lottie.assets, "assetId", "Lottie asset id", context);
    addDuplicateIssues(lottie.assets, "file", "Lottie asset file", context);
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

/**
 * The largest animation the artifact inlines.
 *
 * A generated vector animation is a few kilobytes to a few tens; the cap is
 * there so a pasted-in After Effects export with a thousand keyframed paths
 * cannot turn one welcome screen into a megabyte download on every cold start.
 */
export const BUILDER_V2_MAX_INLINE_LOTTIE_BYTES = 200_000;

/**
 * What the document asserts about an animation before the player sees it.
 *
 * Not the Lottie spec: the handful of top-level facts a player cannot do
 * without, and the two things it must never contain. Anything past that is
 * the player's to render or refuse.
 */
export const BuilderV2UiIrLottieAnimationSchema = z
  .object({
    v: z.string().trim().min(1),
    fr: z.number().positive().max(120),
    ip: z.number().finite(),
    op: z.number().finite(),
    w: z.number().int().positive().max(4_096),
    h: z.number().int().positive().max(4_096),
    layers: z.array(z.unknown()).min(1).max(500),
  })
  .passthrough()
  .superRefine((animation, context) => {
    if (animation.op <= animation.ip) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Lottie outPoint must come after inPoint",
        path: ["op"],
      });
    }
    if (containsExternalReference(animation)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Lottie animations must be vector-only: no images, data URLs or remote assets",
      });
    }
    if (JSON.stringify(animation).length > BUILDER_V2_MAX_INLINE_LOTTIE_BYTES) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Lottie animation exceeds ${BUILDER_V2_MAX_INLINE_LOTTIE_BYTES} bytes`,
      });
    }
  });

export const BuilderV2UiIrLottieSchema = z
  .object({
    assetId: LottieAssetIdSchema,
    animation: BuilderV2UiIrLottieAnimationSchema,
  })
  .strict();

function containsExternalReference(value: unknown): boolean {
  if (typeof value === "string") {
    return /^(?:https?:|data:|file:|blob:)/i.test(value);
  }
  if (Array.isArray(value)) return value.some(containsExternalReference);
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  // `p`/`u` on an asset entry are a file name and a directory: an image.
  if (
    (typeof record.p === "string" && record.p.length > 0) ||
    (typeof record.u === "string" && record.u.length > 0)
  ) {
    return true;
  }
  return Object.values(record).some(containsExternalReference);
}

export type BuilderV2UiIrLottieAnimation = z.infer<
  typeof BuilderV2UiIrLottieAnimationSchema
>;
export type BuilderV2UiIrLottie = z.infer<typeof BuilderV2UiIrLottieSchema>;

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
