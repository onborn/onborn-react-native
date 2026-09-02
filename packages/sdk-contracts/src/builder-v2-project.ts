import { z } from "zod";
import { BuilderV2NativeCapabilityRegistrationSchema } from "./builder-v2-native-capabilities";
import { BuilderV2PaywallPlacementSchema } from "./builder-v2-paywall";
import { BuilderV2ProjectGoogleFontsSchema } from "./builder-v2-google-fonts";
import { BuilderV2ProjectLottieSchema } from "./builder-v2-lottie";
import { BuilderV2ProjectPhosphorIconsSchema } from "./builder-v2-phosphor-icons";
import { BuilderV2ProjectAssetSchema } from "./builder-v2-project-assets";
import { BuilderV2UiIrScreenTransitionKindSchema } from "./builder-v2-ui-ir-motion";

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
/**
 * A plan the screen was designed around, for the canvas to draw.
 *
 * Not a price the flow charges and not a product it sells: the artifact binds
 * plans by position and the device fills them from the live offering. This is
 * what the canvas shows while there is nothing to fill them from — the shape
 * the paywall was composed for, taken from the reference it was built against.
 *
 * It exists because the alternative was worse in both directions. With no
 * offering the canvas fell back to two generic samples, so a screen designed
 * around three tiers was reviewed as two. With a half-configured offering it
 * drew an em dash where each price belongs, and the visual review spent three
 * rounds asking for prices the source could not supply.
 */
/*
 * The optional fields take null as well as absence. A plan wrote
 * "badge": null for the row that has no badge — the natural way to say it in
 * JSON — and the whole specification was refused, costing a repair round that
 * could only delete the word.
 */
const optionalSampleText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value ?? undefined);

export const BuilderV2ProjectScreenPlanSampleSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    price: z.string().trim().min(1).max(40),
    period: optionalSampleText(40),
    trial: optionalSampleText(60),
    badge: optionalSampleText(40),
    description: optionalSampleText(160),
  })
  .strict();

export const BuilderV2ProjectScreenPaywallSchema = z
  .object({
    /*
     * An empty string means the same as absent. The planner is told to name
     * a key only when the request asks for one, and "" is the natural way a
     * model says "none" in a required-feeling field — a live run burned a
     * repair round on min(1) for exactly that.
     */
    offeringKey: z
      .string()
      .trim()
      .max(160)
      .optional()
      .transform((value) => (value ? value : undefined)),
    /**
     * What the canvas draws until a real offering answers.
     *
     * Ordered as the screen lays them out, so plan(0) is the first of these.
     * Replaced entirely once products are attached: the design survives, the
     * numbers come from the store.
     */
    samplePlans: z
      .array(BuilderV2ProjectScreenPlanSampleSchema)
      .max(6)
      .optional(),
  })
  .strict();

/**
 * Where a screen exists: the app journey, the web funnel, or (absent) both.
 *
 * One flow ships to two surfaces from one artifact, and most screens belong
 * to both — so absence means both, and the flag only ever narrows. "Skip the
 * welcome on web" (the ad already did its job) is `["app"]`; an extra quiz
 * question the funnel wants is `["web"]`. Named `channels` to match the
 * analytics dimension, and because `surface` already means
 * onboarding-vs-paywall here.
 */
export const BuilderV2ProjectChannelSchema = z.enum(["app", "web"]);

/**
 * A screen transition as the manifest writes it: the kind alone, or the kind
 * with its own duration. The runtime picks the direction.
 */
export const BuilderV2ProjectScreenTransitionSchema = z.union([
  BuilderV2UiIrScreenTransitionKindSchema,
  z
    .object({
      kind: BuilderV2UiIrScreenTransitionKindSchema,
      durationMs: z.number().int().min(0).max(10_000).optional(),
    })
    .strict(),
]);

/**
 * A route out of a screen: the target, and the answer that selects it.
 * Conditions are the dialect's one predicate — a state equals a value — read
 * against everything the journey has answered so far, so a screen may route
 * on its own answer or on one given three screens earlier.
 */
export const BuilderV2ProjectScreenRouteSchema = z
  .object({
    to: ProjectIdSchema,
    when: z
      .object({
        state: z.string().trim().min(1).max(80),
        equals: z.union([z.string().max(240), z.null()]),
        negate: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const BuilderV2ProjectScreenNextSchema = z.union([
  ProjectIdSchema,
  z.array(BuilderV2ProjectScreenRouteSchema).min(1).max(16),
]);

/**
 * How long a self-leaving screen stays. Under 200ms nothing registers; past
 * 15s a person is being held, and that is a screen with a button.
 */
export const BuilderV2ProjectAutoContinueSchema = z
  .object({
    afterMs: z.number().int().min(200).max(15000),
  })
  .strict();

export const BuilderV2ProjectScreenSchema = z
  .object({
    screenId: ProjectIdSchema,
    file: SourcePathSchema,
    surface: BuilderV2ProjectSurfaceSchema,
    channels: z
      .array(BuilderV2ProjectChannelSchema)
      .min(1)
      .max(2)
      .optional()
      /* Both named is the same as absent; keep the document canonical. */
      .transform((value) =>
        value && new Set(value).size === 2 ? undefined : value,
      ),
    placement: BuilderV2PaywallPlacementSchema.optional(),
    /**
     * Whether the journey's chrome wraps this screen: `false` for a welcome
     * or a paywall that owns its whole canvas, a string to hand the chrome a
     * variant ("outro" for the step whose header goes white), absent for the
     * ordinary case.
     */
    chrome: z.union([z.boolean(), z.string().trim().min(1).max(40)]).optional(),
    /** How this screen arrives, over the flow's `transitions.screen`. */
    transition: BuilderV2ProjectScreenTransitionSchema.optional(),
    /**
     * Where Continue leads from this screen, when not simply the next entry.
     *
     * A quiz that shows a different outro per answer, a branch that rejoins
     * the main path after its outro: rules in order, the first whose `when`
     * holds wins, an entry without `when` is the default. Absent, or no rule
     * holding, means the next screen in the list. Back always returns to the
     * screen the person actually came from.
     */
    next: BuilderV2ProjectScreenNextSchema.optional(),
    /**
     * The screen leaves on its own after this long, as if Continue were
     * pressed: a loading step — "analyzing your answers", a ring filling —
     * that shows for under a second and moves on. Where it goes is its
     * `next`, exactly as for a press.
     */
    autoContinue: BuilderV2ProjectAutoContinueSchema.optional(),
    /**
     * A paywall the app shows on its own, outside the journey.
     *
     * The journey is a sequence someone walks once; a standalone paywall is
     * presented by the app at a moment of its own choosing — a locked feature,
     * a settings upsell, a win-back — and has no next screen and no position.
     * It ships in the same release as the flow it belongs to and is reached by
     * its placement, which is why one is required.
     */
    /*
     * `false` is accepted and means the same as absent. A plan wrote
     * "standalone": false for its ordinary paywall — the natural thing to write
     * — and the whole specification was refused over it, costing a repair round
     * that could only ever delete the word.
     */
    standalone: z
      .boolean()
      .optional()
      .transform((value) => (value === true ? (true as const) : undefined)),
    paywall: BuilderV2ProjectScreenPaywallSchema.optional(),
  })
  .strict()
  .superRefine((screen, context) => {
    if (screen.standalone && screen.surface !== "paywall") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only paywall screens can be standalone",
        path: ["standalone"],
      });
    }
    if (screen.standalone && !screen.placement) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "A standalone paywall needs a placement: the app has no other way to ask for it",
        path: ["placement"],
      });
    }
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
    /**
     * The component that lives above the screens.
     *
     * A header with a back control and a progress bar, a background the
     * whole onboarding shares — the things every step carries and no step
     * owns. Mounted once by the journey and handed each screen as its
     * `children`, so it neither remounts nor loses its animation when the
     * step changes. Screens opt out (or pick a variant) per entry.
     */
    chrome: z.object({ file: SourcePathSchema }).strict().optional(),
    /**
     * The flow's motion defaults. `screen` is how every screen arrives unless
     * its own entry says otherwise; the runtime reverses it on the way back.
     */
    transitions: z
      .object({ screen: BuilderV2ProjectScreenTransitionSchema })
      .strict()
      .optional(),
    legal: BuilderV2ProjectLegalSchema.optional(),
    /**
     * The product this flow is being built as, when there is one.
     *
     * Written by promotion when a run recreated a named product from
     * references verified against the library's own record. Read by every
     * later run on the flow, so "Now create a paywall" after "Create a Wispr
     * Flow welcome" searches for the Wispr Flow paywall and recreates it —
     * instead of composing a generic one in the project's colours, which is
     * what happened when the only memory of the product was the first prompt.
     *
     * In the manifest rather than anywhere hidden: it is visible on the
     * project card, versioned with the revision, removed with one edit, and
     * scoped to this flow. A request to redesign as another product rewrites
     * it.
     */
    recreates: z
      .object({
        product: z.string().trim().min(1).max(80),
        /** The run that last verified it, for provenance. */
        runId: z.string().trim().min(1).max(80).optional(),
      })
      .strict()
      .optional(),
    localization: BuilderV2ProjectLocalizationSchema.optional(),
    capabilities: z
      .array(BuilderV2NativeCapabilityRegistrationSchema)
      .max(32)
      .optional(),
    /**
     * The app's own handlers a screen may call — `runtime.actions.saveProfile(input)`
     * — declared here so the compiler refuses a call to one the app never
     * named. The app lends the implementations at mount (`actions={{ … }}`);
     * the artifact carries only the name and the input. A button that awaits
     * one before navigating stays busy until the app answers.
     */
    actions: z
      .array(
        z
          .object({
            name: z
              .string()
              .regex(/^[a-z][A-Za-z0-9]{0,59}$/, "action names are camelCase identifiers"),
            description: z.string().trim().min(1).max(240).optional(),
          })
          .strict(),
      )
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

    /*
     * Every route lands on a declared screen the journey can walk to. A
     * target that is standalone, or the screen itself, would be a step the
     * runtime cannot take — better refused here than discovered on a device.
     */
    const standalone = new Set(
      manifest.screens.filter((screen) => screen.standalone).map((screen) => screen.screenId),
    );
    manifest.screens.forEach((screen, index) => {
      const routes =
        typeof screen.next === "string" ? [{ to: screen.next }] : (screen.next ?? []);
      routes.forEach((route, routeIndex) => {
        const problem = !screenIds.has(route.to)
          ? `names a screen that does not exist`
          : standalone.has(route.to)
            ? `leads to a standalone paywall, which the journey cannot walk to`
            : route.to === screen.screenId
              ? `leads back to the same screen`
              : null;
        if (problem) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Route to "${route.to}" from "${screen.screenId}" ${problem}`,
            path: ["screens", index, "next", ...(typeof screen.next === "string" ? [] : [routeIndex, "to"])],
          });
        }
      });
    });

    if (!screenIds.has(manifest.entryScreenId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "entryScreenId must reference a declared screen",
        path: ["entryScreenId"],
      });
    }
    if (
      manifest.screens.some(
        (screen) =>
          screen.standalone && screen.screenId === manifest.entryScreenId,
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "entryScreenId cannot be a standalone paywall: the journey has to start on a screen it walks",
        path: ["entryScreenId"],
      });
    }
    if (manifest.screens.every((screen) => screen.standalone)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A project needs at least one screen in its journey",
        path: ["screens"],
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
