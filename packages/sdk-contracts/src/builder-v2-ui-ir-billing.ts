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
 * Which offering a paywall spends: a dashboard offering key, or the
 * environment's current one when omitted.
 */
export const BuilderV2UiIrBillingBindingSchema = z
  .object({
    offeringKey: z.string().trim().min(1).max(160).optional(),
  })
  .strict();

export type BuilderV2UiIrPlanField = z.infer<
  typeof BuilderV2UiIrPlanFieldSchema
>;
export type BuilderV2UiIrPlanRef = z.infer<typeof BuilderV2UiIrPlanRefSchema>;
export type BuilderV2UiIrPlanCondition = z.infer<
  typeof BuilderV2UiIrPlanConditionSchema
>;
export type BuilderV2UiIrBillingBinding = z.infer<
  typeof BuilderV2UiIrBillingBindingSchema
>;
