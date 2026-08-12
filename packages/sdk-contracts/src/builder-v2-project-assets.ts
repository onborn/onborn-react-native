import { z } from "zod";

export const BuilderV2ProjectAssetIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

export const BuilderV2ProjectAssetMediaTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/json",
  "font/ttf",
  "font/otf",
  "font/woff2",
]);

export const BuilderV2ProjectAssetSchema = z
  .object({
    assetId: BuilderV2ProjectAssetIdSchema,
    file: z
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
              (segment) =>
                segment !== "" && segment !== "." && segment !== "..",
            ),
        { message: "Asset paths must be safe relative POSIX paths" },
      ),
    mediaType: BuilderV2ProjectAssetMediaTypeSchema,
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    byteLength: z.number().int().nonnegative(),
  })
  .strict();

export type BuilderV2ProjectAsset = z.infer<typeof BuilderV2ProjectAssetSchema>;
