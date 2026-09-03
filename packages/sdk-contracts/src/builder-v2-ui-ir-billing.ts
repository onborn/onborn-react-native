import { z } from "zod";

/**
 * How a paywall reads the offering the dashboard configured.
 *
 * A published artifact is a static description, so it cannot carry a price: the
 * price belongs to the store, in the viewer's own currency, and is only known
 * on the device. Every Builder V2 paywall until now therefore showed a number
 * the model invented — wrong outside one country, wrong the moment the price
 * changed, and a submission risk in its own right.
 *
 * The artifact instead describes *where* each value comes from, and the runtime
 * fills it in from the loaded offering. Nothing here computes: a binding names
 * a plan and a field, which is as enumerable as the rest of the dialect.
 */

/** Plans are addressed by position; an offering with fewer simply has fewer. */
export const BuilderV2UiIrPlanSlotSchema = z.number().int().min(0).max(7);

export const BuilderV2UiIrPlanFieldSchema = z.enum([
  "title",
  "description",
  "badge",
  "price",
  "period",
  "trial",
]);

/**
 * Which plan a binding reads.
 *
 * `slot` is a fixed position, for the common paywall that lays out two or three
 * plans by hand. `current` is the plan being repeated by a `billing-plans`
 * node, for a paywall that renders whatever the offering contains.
 */
export const BuilderV2UiIrPlanRefSchema = z.union([
  z.object({ slot: BuilderV2UiIrPlanSlotSchema }).strict(),
  z.object({ current: z.literal(true) }).strict(),
]);

/** "This plan exists in the loaded offering." */
export const BuilderV2UiIrPlanConditionSchema = z
  .object({
    plan: BuilderV2UiIrPlanRefSchema,
    negate: z.boolean().optional(),
  })
  .strict();

/**
 * A plan the screen was designed around, in the shape a binding reads.
 *
 * The device answers a paywall's bindings from the loaded offering; these are
 * what it answers with when no offering can be loaded at all — the request
 * failed, or the project sells nothing yet — so the screen still shows the
 * composition its author designed instead of empty rows. Never a substitute
 * for a loaded price: a store that answered always wins, and a purchase
 * from a sample is refused.
 */
export const BuilderV2UiIrPlanSampleSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    price: z.string().trim().min(1).max(40),
    period: z.string().trim().max(40).optional(),
    trial: z.string().trim().max(60).optional(),
    badge: z.string().trim().max(40).optional(),
    description: z.string().trim().max(160).optional(),
  })
  .strict();

/**
 * Which offering a paywall spends: a dashboard offering key, or the
 * environment's current one when omitted — and what it shows when neither
 * can be loaded.
 */
export const BuilderV2UiIrBillingBindingSchema = z
  .object({
    offeringKey: z.string().trim().min(1).max(160).optional(),
    samplePlans: z.array(BuilderV2UiIrPlanSampleSchema).max(6).optional(),
  })
  .strict();

export type BuilderV2UiIrPlanField = z.infer<
  typeof BuilderV2UiIrPlanFieldSchema
>;
export type BuilderV2UiIrPlanRef = z.infer<typeof BuilderV2UiIrPlanRefSchema>;
export type BuilderV2UiIrPlanCondition = z.infer<
  typeof BuilderV2UiIrPlanConditionSchema
>;
export type BuilderV2UiIrPlanSample = z.infer<
  typeof BuilderV2UiIrPlanSampleSchema
>;
export type BuilderV2UiIrBillingBinding = z.infer<
  typeof BuilderV2UiIrBillingBindingSchema
>;
