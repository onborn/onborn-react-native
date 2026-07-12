import { z } from "zod";
import { LayoutConfigSchema, LayoutPresetSchema } from "./layout";
import { FlowThemeSchema, sanitizeThemeLinkedCtaProps } from "./theme";
import { FlowTranslationsSchema } from "./translations";
import {
  BackButtonPrimitiveSchema,
  ProgressBarPrimitiveSchema,
  PrimitiveVisibilitySchema,
  SkipButtonPrimitiveSchema,
  XStackPrimitiveSchema,
  YStackPrimitiveSchema,
} from "./primitives";
import { BenefitsStepSchema, type BenefitsStep } from "./steps/benefits";
import { CustomStepSchema, type CustomStep } from "./steps/custom";
import { LoadingStepSchema, type LoadingStep } from "./steps/loading";
import { MetricsStepSchema, type MetricsStep } from "./steps/metrics";
import {
  NativeCustomStepSchema,
  type NativeCustomStep,
} from "./steps/native-custom";
import {
  PermissionsStepSchema,
  type PermissionsStep,
} from "./steps/permissions";
import { QuizStepSchema, type QuizStep } from "./steps/quiz";
import { QuizAnswerStepSchema, type QuizAnswerStep } from "./steps/quiz-answer";
import {
  SocialProofStepSchema,
  type SocialProofStep,
} from "./steps/social-proof";
import { WelcomeStepSchema, type WelcomeStep } from "./steps/welcome";

export const TemplateSchema = z.enum(["books", "business", "health", "custom"]);
export const AppTypeSchema = z.enum([
  "ai",
  "health",
  "finance",
  "education",
  "productivity",
  "utility",
  "saas",
  "fitness",
  "meditation",
  "coaching",
]);

export const StepTypeSchema = z.enum([
  "welcome",
  "quiz",
  "benefits",
  "custom",
  "loading",
  "metrics",
  "native_custom",
  "permissions",
  "social_proof",
  "quiz_answer",
]);

export { LayoutConfigSchema, LayoutPresetSchema };

export const StepSchema: z.ZodType<
  | WelcomeStep
  | QuizStep
  | BenefitsStep
  | CustomStep
  | LoadingStep
  | MetricsStep
  | NativeCustomStep
  | PermissionsStep
  | QuizAnswerStep
  | SocialProofStep
> = z.discriminatedUnion("type", [
  WelcomeStepSchema,
  QuizStepSchema,
  BenefitsStepSchema,
  CustomStepSchema,
  LoadingStepSchema,
  MetricsStepSchema,
  NativeCustomStepSchema,
  PermissionsStepSchema,
  QuizAnswerStepSchema,
  SocialProofStepSchema,
]);

const FLOW_STACK_MAX_CHILDREN = 6;

function isFlowStackPrimitive(value: unknown): value is {
  type?: unknown;
  props?: { children?: unknown };
} {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    ((value as { type?: unknown }).type === "x_stack" ||
      (value as { type?: unknown }).type === "y_stack")
  );
}

const FlowStackPropsOverrideSchema = z.object({
  children: z
    .array(
      z
        .object({
          type: z.string(),
          visible: z.boolean().optional(),
          visibility: PrimitiveVisibilitySchema.optional(),
          props: z.record(z.string(), z.unknown()),
        })
        .strict()
        .superRefine((primitive, ctx) => {
          if (primitive.type !== "x_stack" && primitive.type !== "y_stack") {
            return;
          }
          const children = primitive.props.children;
          if (!Array.isArray(children)) {
            return;
          }
          if (children.length > FLOW_STACK_MAX_CHILDREN) {
            ctx.addIssue({
              code: z.ZodIssueCode.too_big,
              maximum: FLOW_STACK_MAX_CHILDREN,
              type: "array",
              inclusive: true,
              path: ["props", "children"],
              message: `Nested flow stacks can contain at most ${FLOW_STACK_MAX_CHILDREN} children`,
            });
          }
          children.forEach((child, index) => {
            if (!isFlowStackPrimitive(child)) {
              return;
            }
            const grandChildren = child.props?.children;
            if (!Array.isArray(grandChildren)) {
              return;
            }
            if (grandChildren.length > FLOW_STACK_MAX_CHILDREN) {
              ctx.addIssue({
                code: z.ZodIssueCode.too_big,
                maximum: FLOW_STACK_MAX_CHILDREN,
                type: "array",
                inclusive: true,
                path: ["props", "children", index, "props", "children"],
                message: `Nested flow stacks can contain at most ${FLOW_STACK_MAX_CHILDREN} children`,
              });
            }
            grandChildren.forEach((grandChild, grandChildIndex) => {
              if (!isFlowStackPrimitive(grandChild)) {
                return;
              }
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [
                  "props",
                  "children",
                  index,
                  "props",
                  "children",
                  grandChildIndex,
                  "type",
                ],
                message:
                  "Flow stacks can nest up to 2 levels; nested flow stacks cannot contain another x_stack/y_stack",
              });
            });
          });
        }),
    )
    .max(FLOW_STACK_MAX_CHILDREN)
    .optional(),
});

const FlowBackButtonPrimitiveSchema = BackButtonPrimitiveSchema.extend({
  visibility: PrimitiveVisibilitySchema.optional(),
});

const FlowSkipButtonPrimitiveSchema = SkipButtonPrimitiveSchema.extend({
  visibility: PrimitiveVisibilitySchema.optional(),
});

const FlowProgressBarPrimitiveSchema = ProgressBarPrimitiveSchema.extend({
  visibility: PrimitiveVisibilitySchema.optional(),
});

const FlowXStackPrimitiveSchema = XStackPrimitiveSchema.extend({
  visibility: PrimitiveVisibilitySchema.optional(),
  props: XStackPrimitiveSchema.shape.props.merge(FlowStackPropsOverrideSchema),
});

const FlowYStackPrimitiveSchema = YStackPrimitiveSchema.extend({
  visibility: PrimitiveVisibilitySchema.optional(),
  props: YStackPrimitiveSchema.shape.props.merge(FlowStackPropsOverrideSchema),
});

const FlowPrimitiveEntrySchema = z.union([
  FlowBackButtonPrimitiveSchema,
  FlowSkipButtonPrimitiveSchema,
  FlowProgressBarPrimitiveSchema,
  FlowXStackPrimitiveSchema,
  FlowYStackPrimitiveSchema,
]);

export const FlowPrimitivesSchema = z
  .object({
    back_button: FlowBackButtonPrimitiveSchema.optional(),
    skip_button: FlowSkipButtonPrimitiveSchema.optional(),
    progress_bar: FlowProgressBarPrimitiveSchema.optional(),
    x_stack: FlowXStackPrimitiveSchema.optional(),
    y_stack: FlowYStackPrimitiveSchema.optional(),
  })
  .catchall(FlowPrimitiveEntrySchema);

export const FlowThemeMetaSchema = z
  .object({
    selectedThemeId: z.string().optional(),
    customTheme: FlowThemeSchema.optional(),
  })
  .strict();

export const FlowStoreReviewSchema = z
  .object({
    triggerStepId: z.string().trim().min(1).optional(),
  })
  .strict();

const FlowConfigShape: {
  id: z.ZodString;
  name: z.ZodOptional<z.ZodString>;
  version: z.ZodNumber;
  template: typeof TemplateSchema;
  appType: z.ZodOptional<typeof AppTypeSchema>;
  theme: z.ZodOptional<typeof FlowThemeSchema>;
  themeMeta: z.ZodOptional<typeof FlowThemeMetaSchema>;
  translations: z.ZodOptional<typeof FlowTranslationsSchema>;
  storeReview: z.ZodOptional<typeof FlowStoreReviewSchema>;
  primitives: z.ZodOptional<typeof FlowPrimitivesSchema>;
  steps: z.ZodArray<typeof StepSchema>;
} = {
  id: z.string(),
  name: z.string().trim().min(1).max(50).optional(),
  version: z.number(),
  template: TemplateSchema,
  appType: AppTypeSchema.optional(),
  theme: FlowThemeSchema.optional(),
  themeMeta: FlowThemeMetaSchema.optional(),
  translations: FlowTranslationsSchema.optional(),
  storeReview: FlowStoreReviewSchema.optional(),
  primitives: FlowPrimitivesSchema.optional(),
  steps: z.array(StepSchema),
};

export const FlowConfigSchema: z.ZodObject<typeof FlowConfigShape> =
  z.object(FlowConfigShape);

export type Template = z.infer<typeof TemplateSchema>;
export type AppType = z.infer<typeof AppTypeSchema>;
export type StepType = z.infer<typeof StepTypeSchema>;
export type Step = z.infer<typeof StepSchema>;
export type FlowPrimitives = z.infer<typeof FlowPrimitivesSchema>;
export type FlowThemeMeta = z.infer<typeof FlowThemeMetaSchema>;
export type FlowStoreReview = z.infer<typeof FlowStoreReviewSchema>;
export type FlowConfig = z.infer<typeof FlowConfigSchema>;

/** Strip non-token CTA style overrides so theme-linked buttons follow flow.theme after preset apply. */
export function sanitizeFlowThemeLinkedCtaProps(flow: FlowConfig): FlowConfig {
  return {
    ...flow,
    steps: flow.steps.map((step) => {
      if (!step.primitives || typeof step.primitives !== "object") {
        return step;
      }

      const nextPrimitives = { ...step.primitives } as Record<string, unknown>;
      for (const [key, value] of Object.entries(step.primitives)) {
        if (
          !value ||
          typeof value !== "object" ||
          Array.isArray(value) ||
          (value as { type?: string }).type !== "cta_button"
        ) {
          continue;
        }

        const primitive = value as { props?: Record<string, unknown> };
        nextPrimitives[key] = {
          ...value,
          props: sanitizeThemeLinkedCtaProps({
            ...(primitive.props ?? {}),
          }),
        };
      }

      return {
        ...step,
        primitives: nextPrimitives,
      } as Step;
    }),
  };
}
