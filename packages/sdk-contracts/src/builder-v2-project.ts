import { z } from "zod";
import { BuilderV2NativeCapabilityRegistrationSchema } from "./builder-v2-native-capabilities";
import { BuilderV2PaywallPlacementSchema } from "./builder-v2-paywall";
import { BuilderV2ProjectGoogleFontsSchema } from "./builder-v2-google-fonts";
import { BuilderV2ProjectLottieSchema } from "./builder-v2-lottie";
import { BuilderV2ProjectPhosphorIconsSchema } from "./builder-v2-phosphor-icons";
import { BuilderV2ProjectAssetSchema } from "./builder-v2-project-assets";

export {
  BuilderV2ProjectAssetIdSchema,
  BuilderV2ProjectAssetMediaTypeSchema,
  BuilderV2ProjectAssetSchema,
  type BuilderV2ProjectAsset,
} from "./builder-v2-project-assets";

export const BUILDER_V2_PROJECT_MANIFEST_PATH = "onborn.project.json";
export const BUILDER_V2_PROJECT_SCHEMA_VERSION = 1 as const;

const ProjectIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_./:-]*$/);

const SourcePathSchema = z
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
          (segment) => segment !== "" && segment !== "." && segment !== "..",
        ),
    { message: "Source paths must be safe relative POSIX paths" },
  );

const LocaleCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(35)
  .regex(/^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-[A-Z]{2}|\d{3})?$/);

export const BuilderV2ProjectSurfaceSchema = z.enum(["onboarding", "paywall"]);

/**
 * The addresses a paywall is required to link.
 *
 * Project-level because they are the app's own legal documents: the same two
 * URLs on every paywall, and nothing a screen should own a copy of. Keeping
 * them here is what lets the builder edit them without touching a screen, and
 * what lets the compiler refuse a terms link that points nowhere.
 */
export const BuilderV2ProjectLegalSchema = z
  .object({
    termsUrl: z.string().trim().url().max(2_048).optional(),
    privacyUrl: z.string().trim().url().max(2_048).optional(),
  })
  .strict();

/**
 * Which offering a paywall screen spends.
 *
 * Per screen rather than per project: a flow may well show a discounted
 * offering at one placement and the standard one at another. Omitted means the
 * environment's current offering, which is what every existing flow gets, so
 * adding this changes nothing until someone chooses.
 */
export const BuilderV2ProjectScreenPaywallSchema = z
  .object({
    offeringKey: z.string().trim().min(1).max(160).optional(),
  })
  .strict();

export const BuilderV2ProjectScreenSchema = z
  .object({
    screenId: ProjectIdSchema,
    file: SourcePathSchema,
    surface: BuilderV2ProjectSurfaceSchema,
    placement: BuilderV2PaywallPlacementSchema.optional(),
    paywall: BuilderV2ProjectScreenPaywallSchema.optional(),
  })
  .strict()
  .superRefine((screen, context) => {
    if (screen.paywall && screen.surface !== "paywall") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only paywall screens can carry paywall settings",
        path: ["paywall"],
      });
    }
    if (screen.placement && screen.surface !== "paywall") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only paywall screens can declare a placement",
        path: ["placement"],
      });
    }
  });

export const BuilderV2ProjectLocaleSchema = z
  .object({
    code: LocaleCodeSchema,
    label: z.string().trim().min(1).max(80),
  })
  .strict();

export const BuilderV2ProjectLocalizationSchema = z
  .object({
    defaultLocale: LocaleCodeSchema,
    locales: z.array(BuilderV2ProjectLocaleSchema).min(1).max(100),
    resources: z.record(LocaleCodeSchema, SourcePathSchema),
  })
  .strict()
  .superRefine((localization, context) => {
    const localeCodes = new Set<string>();
    const resourcePaths = new Set<string>();
    localization.locales.forEach((locale, index) => {
      if (localeCodes.has(locale.code)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate locale code "${locale.code}"`,
          path: ["locales", index, "code"],
        });
      }
      localeCodes.add(locale.code);
      const resourcePath = localization.resources[locale.code];
      if (!resourcePath) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Locale "${locale.code}" must reference its own resource file`,
          path: ["resources", locale.code],
        });
        return;
      }
      if (resourcePaths.has(resourcePath)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Resource file "${resourcePath}" cannot be shared by multiple locales`,
          path: ["resources", locale.code],
        });
      }
      resourcePaths.add(resourcePath);
    });
    if (!localeCodes.has(localization.defaultLocale)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "defaultLocale must reference a declared locale",
        path: ["defaultLocale"],
      });
    }
    for (const localeCode of Object.keys(localization.resources)) {
      if (!localeCodes.has(localeCode)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Resource locale "${localeCode}" must be declared in locales`,
          path: ["resources", localeCode],
        });
      }
    }
  });

export const BuilderV2ProjectManifestSchema = z
  .object({
    schemaVersion: z.literal(BUILDER_V2_PROJECT_SCHEMA_VERSION),
    name: z.string().trim().min(1).max(120).optional(),
    entryScreenId: ProjectIdSchema,
    themeFile: SourcePathSchema.optional(),
    fonts: BuilderV2ProjectGoogleFontsSchema.optional(),
    lottie: BuilderV2ProjectLottieSchema.optional(),
    phosphorIcons: BuilderV2ProjectPhosphorIconsSchema.optional(),
    assets: z.array(BuilderV2ProjectAssetSchema).max(1_000).optional(),
    screens: z.array(BuilderV2ProjectScreenSchema).min(1).max(1_000),
    legal: BuilderV2ProjectLegalSchema.optional(),
    localization: BuilderV2ProjectLocalizationSchema.optional(),
    capabilities: z
      .array(BuilderV2NativeCapabilityRegistrationSchema)
      .max(32)
      .optional(),
  })
  .strict()
  .superRefine((manifest, context) => {
    const screenIds = new Set<string>();
    const files = new Set<string>();
    const placements = new Set<string>();
    const capabilityNames = new Set<string>();
    const assetIds = new Set<string>();
    const assetFiles = new Set<string>();

    manifest.screens.forEach((screen, index) => {
      if (screenIds.has(screen.screenId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate screen id "${screen.screenId}"`,
          path: ["screens", index, "screenId"],
        });
      }
      if (files.has(screen.file)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Source file "${screen.file}" cannot own multiple screens`,
          path: ["screens", index, "file"],
        });
      }
      screenIds.add(screen.screenId);
      files.add(screen.file);
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

    if (!screenIds.has(manifest.entryScreenId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "entryScreenId must reference a declared screen",
        path: ["entryScreenId"],
      });
    }

    (manifest.capabilities ?? []).forEach((capability, index) => {
      if (capabilityNames.has(capability.name)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate native capability "${capability.name}"`,
          path: ["capabilities", index, "name"],
        });
      }
      capabilityNames.add(capability.name);
    });

    (manifest.assets ?? []).forEach((asset, index) => {
      if (assetIds.has(asset.assetId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate asset id "${asset.assetId}"`,
          path: ["assets", index, "assetId"],
        });
      }
      if (assetFiles.has(asset.file)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate asset file "${asset.file}"`,
          path: ["assets", index, "file"],
        });
      }
      assetIds.add(asset.assetId);
      assetFiles.add(asset.file);
    });
  });

export type BuilderV2ProjectSurface = z.infer<
  typeof BuilderV2ProjectSurfaceSchema
>;
export type BuilderV2ProjectScreen = z.infer<
  typeof BuilderV2ProjectScreenSchema
>;
export type BuilderV2ProjectLocale = z.infer<
  typeof BuilderV2ProjectLocaleSchema
>;
export type BuilderV2ProjectLocalization = z.infer<
  typeof BuilderV2ProjectLocalizationSchema
>;
export type BuilderV2ProjectLegal = z.infer<typeof BuilderV2ProjectLegalSchema>;

export type BuilderV2ProjectScreenPaywall = z.infer<
  typeof BuilderV2ProjectScreenPaywallSchema
>;

export type BuilderV2ProjectManifest = z.infer<
  typeof BuilderV2ProjectManifestSchema
>;
